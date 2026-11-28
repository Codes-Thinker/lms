import { Injectable } from "@nestjs/common";
import { AccountType, AttendanceStatus, LeaveStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SystemService } from "../system/system.service";
import {
  OFFICE_TZ,
  officeDateKey,
  parseHmToMinutes,
  shiftEndInstantOnDate,
} from "./attendance-time";

export type DayHoursStatus =
  | "COMPLETE"
  | "LATE"
  | "EARLY_DEPARTURE"
  | "ABSENT"
  | "LEAVE"
  | "AUTO_CHECKOUT"
  | "INCOMPLETE"
  | "OFF";

export type DayHoursRow = {
  date: string;
  workingDay: boolean;
  holiday: boolean;
  holidayLabel: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  autoCheckout: boolean;
  expectedHours: number;
  workedHours: number;
  missingHours: number;
  overtimeHours: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  status: DayHoursStatus;
  leaveDays: number;
  note: string | null;
};

export type PeriodSummary = {
  from: string;
  to: string;
  expectedHours: number;
  workedHours: number;
  missingHours: number;
  overtimeHours: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lateArrivals: number;
  earlyDepartures: number;
  autoCheckouts: number;
  days: DayHoursRow[];
};

@Injectable()
export class StaffHoursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly system: SystemService
  ) {}

  private parseDayList(raw: string | null | undefined, fallback: number[]): number[] {
    const parts = (raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 6);
    return parts.length ? parts : fallback;
  }

  private weekdayUtcDate(date: Date): number {
    return date.getUTCDay();
  }

  private dateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private addDays(date: Date, n: number): Date {
    const x = new Date(date);
    x.setUTCDate(x.getUTCDate() + n);
    return x;
  }

  private parseDateKey(key: string): Date {
    return new Date(`${key}T00:00:00.000Z`);
  }

  private hoursFromMinutes(mins: number): number {
    return Math.round((mins / 60) * 100) / 100;
  }

  private shiftLengthHours(startHm: string, endHm: string): number {
    const start = parseHmToMinutes(startHm);
    const end = parseHmToMinutes(endHm);
    return Math.max(0, this.hoursFromMinutes(end - start));
  }

  private periodBounds(
    period: string | undefined,
    from?: string,
    to?: string
  ): { from: Date; to: Date } {
    const todayKey = officeDateKey(new Date(), OFFICE_TZ);
    const today = this.parseDateKey(todayKey);
    const p = (period ?? "").toLowerCase();
    if (from && to) {
      return { from: this.parseDateKey(from), to: this.parseDateKey(to) };
    }
    if (p === "week") {
      // Week containing today in office TZ: Sun–Sat window, report will skip off days.
      const wd = this.weekdayUtcDate(today);
      const sunday = this.addDays(today, -wd);
      return { from: sunday, to: this.addDays(sunday, 6) };
    }
    if (p === "month") {
      const y = today.getUTCFullYear();
      const m = today.getUTCMonth();
      return {
        from: new Date(Date.UTC(y, m, 1)),
        to: new Date(Date.UTC(y, m + 1, 0)),
      };
    }
    // today
    return { from: today, to: today };
  }

  async board(dateKey?: string) {
    const key = dateKey?.trim() || officeDateKey(new Date(), OFFICE_TZ);
    const day = this.parseDateKey(key);
    const staff = await this.prisma.user.findMany({
      where: {
        accountType: { in: [AccountType.STAFF, AccountType.INTERN] },
        status: { in: ["ACTIVE", "INVITED"] },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        designation: true,
        profileImage: true,
        accountType: true,
        status: true,
      },
      orderBy: { fullName: "asc" },
    });

    const rows = [];
    for (const u of staff) {
      const dayRow = await this.computeDay(u.id, day, {
        accountType: u.accountType,
      });
      rows.push({
        userId: u.id,
        name: u.fullName,
        email: u.email,
        designation: u.designation,
        profileImage: u.profileImage,
        accountType: u.accountType,
        status: u.status,
        today: dayRow,
      });
    }
    return { date: key, rows };
  }

  async summary(
    userId: string,
    opts: { period?: string; from?: string; to?: string }
  ): Promise<PeriodSummary & { userId: string }> {
    const { from, to } = this.periodBounds(opts.period, opts.from, opts.to);
    const days: DayHoursRow[] = [];
    for (let d = new Date(from); d <= to; d = this.addDays(d, 1)) {
      days.push(await this.computeDay(userId, d));
    }
    const agg = this.aggregate(days);
    return {
      userId,
      from: this.dateKey(from),
      to: this.dateKey(to),
      ...agg,
      days,
    };
  }

  async history(
    userId: string,
    opts: { from?: string; to?: string; period?: string }
  ) {
    return this.summary(userId, opts);
  }

  private aggregate(days: DayHoursRow[]) {
    let expectedHours = 0;
    let workedHours = 0;
    let overtimeHours = 0;
    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let lateArrivals = 0;
    let earlyDepartures = 0;
    let autoCheckouts = 0;

    for (const d of days) {
      expectedHours += d.expectedHours;
      workedHours += d.workedHours;
      overtimeHours += d.overtimeHours;
      leaveDays += d.leaveDays;
      if (d.autoCheckout) autoCheckouts += 1;
      if (d.status === "ABSENT") absentDays += 1;
      if (
        d.status === "COMPLETE" ||
        d.status === "LATE" ||
        d.status === "EARLY_DEPARTURE" ||
        d.status === "AUTO_CHECKOUT" ||
        d.status === "INCOMPLETE"
      ) {
        if (d.workedHours > 0 || d.checkInAt) presentDays += 1;
      }
      if (d.lateMinutes > 0) lateArrivals += 1;
      if (d.earlyDepartureMinutes > 0) earlyDepartures += 1;
    }

    const missingHours = Math.max(
      0,
      Math.round((expectedHours - workedHours) * 100) / 100
    );

    return {
      expectedHours: Math.round(expectedHours * 100) / 100,
      workedHours: Math.round(workedHours * 100) / 100,
      missingHours,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      presentDays,
      absentDays,
      leaveDays: Math.round(leaveDays * 100) / 100,
      lateArrivals,
      earlyDepartures,
      autoCheckouts,
    };
  }

  private async computeDay(
    userId: string,
    day: Date,
    hint?: { accountType?: AccountType }
  ): Promise<DayHoursRow> {
    const key = this.dateKey(day);
    const cfg = await this.system.getOfficeConfig();
    const workingDays = this.parseDayList(cfg.staffWorkingDays, [0, 1, 2, 3, 4, 5]);
    const offDays = this.parseDayList(cfg.staffOffDays, [6]);
    const wd = this.weekdayUtcDate(day);
    const holiday = await this.prisma.officeHoliday.findUnique({
      where: { date: day },
    });

    const user =
      hint?.accountType != null
        ? { accountType: hint.accountType }
        : await this.prisma.user.findUnique({
            where: { id: userId },
            select: { accountType: true },
          });

    const shift = await this.system.resolveShiftTimes(userId);
    const fullDayHours = this.shiftLengthHours(shift.startTime, shift.endTime);
    void user;
    // Working day calendar uses staff week config (Sun–Fri default); holidays excluded.
    const calendarWorking =
      workingDays.includes(wd) && !offDays.includes(wd) && !holiday;

    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        studentId: userId,
        status: LeaveStatus.APPROVED,
        leaveDate: {
          // leave may span durationDays — approximate: leaveDate within ±3 days window then filter
          gte: this.addDays(day, -3),
          lte: day,
        },
      },
    });

    let leaveDays = 0;
    for (const lv of leaves) {
      const start = lv.leaveDate;
      const endExclusive = this.addDays(start, Math.ceil(lv.durationDays));
      // Cover fractional days: if day is within [start, start+duration)
      const dayTime = day.getTime();
      const startTime = start.getTime();
      const endTime = endExclusive.getTime();
      if (dayTime >= startTime && dayTime < endTime) {
        // If half day starting this calendar day
        if (this.dateKey(start) === key && lv.durationDays < 1) {
          leaveDays += lv.durationDays;
        } else if (this.dateKey(start) === key && lv.durationDays >= 1) {
          leaveDays += 1;
        } else if (dayTime > startTime && dayTime < endTime) {
          leaveDays += 1;
        }
      }
    }
    leaveDays = Math.min(1, leaveDays);

    if (!calendarWorking) {
      return {
        date: key,
        workingDay: false,
        holiday: Boolean(holiday),
        holidayLabel: holiday?.label ?? null,
        scheduledStart: null,
        scheduledEnd: null,
        checkInAt: null,
        checkOutAt: null,
        autoCheckout: false,
        expectedHours: 0,
        workedHours: 0,
        missingHours: 0,
        overtimeHours: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        status: holiday ? "OFF" : "OFF",
        leaveDays: 0,
        note: holiday ? holiday.label : "Weekly off",
      };
    }

    const expectedHours = Math.max(
      0,
      Math.round((fullDayHours * (1 - leaveDays)) * 100) / 100
    );

    const record = await this.prisma.attendanceRecord.findFirst({
      where: { userId, date: day },
      orderBy: { createdAt: "asc" },
    });

    if (leaveDays >= 1 && !record?.checkInAt) {
      return {
        date: key,
        workingDay: true,
        holiday: false,
        holidayLabel: null,
        scheduledStart: shift.startTime,
        scheduledEnd: shift.endTime,
        checkInAt: null,
        checkOutAt: null,
        autoCheckout: false,
        expectedHours: 0,
        workedHours: 0,
        missingHours: 0,
        overtimeHours: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        status: "LEAVE",
        leaveDays,
        note: "Approved leave",
      };
    }

    if (record?.status === AttendanceStatus.LEAVE && !record.checkInAt) {
      return {
        date: key,
        workingDay: true,
        holiday: false,
        holidayLabel: null,
        scheduledStart: shift.startTime,
        scheduledEnd: shift.endTime,
        checkInAt: null,
        checkOutAt: null,
        autoCheckout: false,
        expectedHours: 0,
        workedHours: 0,
        missingHours: 0,
        overtimeHours: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        status: "LEAVE",
        leaveDays: leaveDays || 1,
        note: "Leave",
      };
    }

    if (!record?.checkInAt) {
      return {
        date: key,
        workingDay: true,
        holiday: false,
        holidayLabel: null,
        scheduledStart: shift.startTime,
        scheduledEnd: shift.endTime,
        checkInAt: null,
        checkOutAt: null,
        autoCheckout: false,
        expectedHours,
        workedHours: 0,
        missingHours: expectedHours,
        overtimeHours: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        status: expectedHours <= 0 ? "LEAVE" : "ABSENT",
        leaveDays,
        note: expectedHours <= 0 ? "Covered by leave" : "No check-in",
      };
    }

    const shiftStart = record.shiftStart ?? shift.startTime;
    const shiftEnd = record.shiftEnd ?? shift.endTime;
    const shiftEndAt = shiftEndInstantOnDate(day, shiftEnd, OFFICE_TZ);
    const now = new Date();
    const isToday = key === officeDateKey(now, OFFICE_TZ);

    let end = record.checkOutAt;
    if (!end) {
      if (isToday) {
        end = now.getTime() < shiftEndAt.getTime() ? now : shiftEndAt;
      } else {
        end = shiftEndAt;
      }
    }

    // Cap regular session end at shift end for worked hours; OT separate if checkout after shift
    const rawEnd = record.checkOutAt ?? end;
    const cappedEnd =
      rawEnd.getTime() > shiftEndAt.getTime() ? shiftEndAt : rawEnd;
    const workedMs = Math.max(
      0,
      cappedEnd.getTime() - record.checkInAt.getTime()
    );
    let workedHours = this.hoursFromMinutes(Math.round(workedMs / 60000));

    let overtimeHours = 0;
    if (record.checkOutAt && record.checkOutAt.getTime() > shiftEndAt.getTime()) {
      overtimeHours = this.hoursFromMinutes(
        Math.round(
          (record.checkOutAt.getTime() - shiftEndAt.getTime()) / 60000
        )
      );
    }

    // Formula per plan
    const missingHours = Math.max(
      0,
      Math.round((expectedHours - workedHours) * 100) / 100
    );
    overtimeHours = Math.max(
      overtimeHours,
      Math.max(0, Math.round((workedHours - expectedHours) * 100) / 100)
    );
    // Prefer explicit post-shift OT; if worked within window exceeds expected (shouldn't), keep formula OT
    if (record.checkOutAt && record.checkOutAt.getTime() > shiftEndAt.getTime()) {
      // workedHours is capped; OT is post-shift only
      overtimeHours = this.hoursFromMinutes(
        Math.round(
          (record.checkOutAt.getTime() - shiftEndAt.getTime()) / 60000
        )
      );
    } else {
      overtimeHours = Math.max(
        0,
        Math.round((workedHours - expectedHours) * 100) / 100
      );
    }

    const startMins = parseHmToMinutes(shiftStart);
    const endMins = parseHmToMinutes(shiftEnd);
    const checkInMins = this.minutesOnDay(record.checkInAt);
    const checkOutMins = record.checkOutAt
      ? this.minutesOnDay(record.checkOutAt)
      : null;
    const lateMinutes = Math.max(0, checkInMins - (startMins + 5));
    const earlyDepartureMinutes =
      checkOutMins != null && !record.autoCheckout
        ? Math.max(0, endMins - checkOutMins)
        : 0;

    let status: DayHoursStatus = "COMPLETE";
    if (!record.checkOutAt && isToday) status = "INCOMPLETE";
    else if (record.autoCheckout) status = "AUTO_CHECKOUT";
    else if (earlyDepartureMinutes >= 15) status = "EARLY_DEPARTURE";
    else if (lateMinutes > 0) status = "LATE";
    else if (missingHours > 0.25) status = "EARLY_DEPARTURE";

    if (missingHours <= 0.05 && lateMinutes === 0 && !record.autoCheckout) {
      status = "COMPLETE";
    }

    return {
      date: key,
      workingDay: true,
      holiday: false,
      holidayLabel: null,
      scheduledStart: shiftStart,
      scheduledEnd: shiftEnd,
      checkInAt: record.checkInAt.toISOString(),
      checkOutAt: record.checkOutAt?.toISOString() ?? null,
      autoCheckout: record.autoCheckout,
      expectedHours,
      workedHours: Math.round(workedHours * 100) / 100,
      missingHours,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      lateMinutes,
      earlyDepartureMinutes,
      status,
      leaveDays,
      note: record.autoCheckout
        ? "Automatic checkout"
        : record.source === "GEOFENCE_EXIT"
          ? "Geofence exit checkout"
          : null,
    };
  }

  private minutesOnDay(at: Date): number {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: OFFICE_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(at);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return h * 60 + m;
  }
}
