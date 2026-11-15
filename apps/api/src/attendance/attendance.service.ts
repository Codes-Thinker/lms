import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from "@nestjs/common";
import { AttendanceStatus } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SystemService } from "../system/system.service";

/** Haversine distance in meters between two lat/lng points. */
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class AttendanceService implements OnModuleInit {
  private autoCheckoutTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly system: SystemService,
  ) {}

  /** Run auto-checkout check every 60 seconds. */
  onModuleInit() {
    this.autoCheckoutTimer = setInterval(() => {
      this.runAutoCheckout().catch((e) => {
        console.error("Auto-checkout error:", e);
      });
    }, 60_000);
  }

  private todayDate(): Date {
    // Office timezone (Asia/Karachi) — avoid UTC day-roll issues for Pakistan LMS.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const y = Number(parts.find((p) => p.type === "year")?.value);
    const m = Number(parts.find((p) => p.type === "month")?.value);
    const d = Number(parts.find((p) => p.type === "day")?.value);
    return new Date(Date.UTC(y, m - 1, d));
  }

  private isLate(now: Date, shiftStart: string | null): boolean {
    const [h, m] = (shiftStart ?? "10:00").split(":").map(Number);
    // 5-minute grace after shift start
    const cutoff = new Date(now);
    cutoff.setHours(h ?? 10, (m ?? 0) + 5, 0, 0);
    return now.getTime() > cutoff.getTime();
  }

  async myHistory(userId: string) {
    const rows = await this.prisma.attendanceRecord.findMany({
      where: { userId },
      include: { course: true, user: true },
      orderBy: { date: "desc" },
      take: 60,
    });
    return rows.map((r) => this.map(r));
  }

  async list(filters?: {
    date?: string;
    accountType?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    courseId?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.date) {
      const d = new Date(filters.date);
      d.setHours(0, 0, 0, 0);
      where.date = d;
    }
    if (filters?.startDate && filters?.endDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (filters?.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      where.date = { gte: start };
    } else if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { lte: end };
    }
    if (filters?.accountType) {
      where.user = { accountType: filters.accountType };
    }
    if (filters?.status) {
      where.status = filters.status as AttendanceStatus;
    }
    if (filters?.courseId) {
      where.OR = [
        { courseId: filters.courseId },
        { user: { enrollments: { some: { courseId: filters.courseId } } } },
      ];
    }
    const rows = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        course: true,
        user: {
          include: {
            enrollments: {
              include: { course: { select: { id: true, title: true, category: true } } },
            },
          },
        },
      },
      orderBy: [{ date: "desc" }, { checkInAt: "desc" }],
      take: 500,
    });
    return rows.map((r) => this.map(r));
  }

  /**
   * Admin board: tabs = courses with enrollments; rows = every enrolled
   * student for the selected course (or all marked attendance when All).
   */
  async board(filters?: { date?: string; courseId?: string }) {
    const day = filters?.date
      ? (() => {
          const d = new Date(filters.date!);
          d.setHours(0, 0, 0, 0);
          return d;
        })()
      : this.todayDate();
    const dateStr = day.toISOString().slice(0, 10);

    const courses = await this.prisma.course.findMany({
      where: {
        published: true,
        enrollments: { some: {} },
      },
      select: {
        id: true,
        title: true,
        category: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: { title: "asc" },
    });

    const courseTabs = courses.map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      enrolledCount: c._count.enrollments,
    }));

    if (filters?.courseId) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { courseId: filters.courseId },
        include: {
          user: true,
          course: { select: { id: true, title: true, category: true } },
        },
        orderBy: { user: { fullName: "asc" } },
      });
      const userIds = enrollments.map((e) => e.userId);
      const marks = await this.prisma.attendanceRecord.findMany({
        where: { date: day, userId: { in: userIds } },
        include: {
          course: true,
          user: {
            include: {
              enrollments: {
                include: {
                  course: { select: { id: true, title: true, category: true } },
                },
              },
            },
          },
        },
      });
      const byUser = new Map(marks.map((m) => [m.userId, m]));
      const courseMeta = enrollments[0]?.course;
      const rows = enrollments.map((enr) => {
        const mark = byUser.get(enr.userId);
        if (mark) return this.map(mark);
        return this.mapAbsent({
          userId: enr.userId,
          fullName: enr.user.fullName,
          accountType: enr.user.accountType,
          date: day,
          courseId: courseMeta?.id ?? enr.courseId,
          courseTitle: courseMeta?.title ?? null,
          courses: [
            {
              id: enr.course.id,
              title: enr.course.title,
              category: enr.course.category,
            },
          ],
        });
      });
      return { date: dateStr, courses: courseTabs, rows };
    }

    // All tab — every attendance mark for the day (app-sourced), enriched
    const marks = await this.prisma.attendanceRecord.findMany({
      where: { date: day },
      include: {
        course: true,
        user: {
          include: {
            enrollments: {
              include: {
                course: { select: { id: true, title: true, category: true } },
              },
            },
          },
        },
      },
      orderBy: [{ checkInAt: "desc" }],
      take: 500,
    });
    return {
      date: dateStr,
      courses: courseTabs,
      rows: marks.map((r) => this.map(r)),
    };
  }

  async checkIn(
    userId: string,
    opts?: { courseId?: string; lat?: number; lng?: number },
  ) {
    const date = this.todayDate();
    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { userId, date },
    });
    if (existing?.checkInAt && !existing.checkOutAt) {
      throw new BadRequestException("Already checked in");
    }

    if (opts?.lat == null || opts?.lng == null) {
      throw new BadRequestException(
        "Location required for check-in. Enable GPS and try again.",
      );
    }

    const config = await this.system.getOfficeConfig();
    const distance = haversine(
      opts.lat,
      opts.lng,
      config.latitude,
      config.longitude,
    );
    if (distance > config.radiusMeters) {
      throw new BadRequestException(
        `You must be within ${config.radiusMeters}m of the office to check in. You are ${Math.round(distance)}m away.`,
      );
    }

    const shift = await this.system.resolveShiftTimes(userId);
    const shiftStart = shift.startTime;
    const shiftEnd = shift.endTime;

    let courseId = opts?.courseId ?? existing?.courseId ?? null;
    if (!courseId) {
      const enr = await this.prisma.enrollment.findFirst({
        where: { userId },
        orderBy: { enrolledAt: "asc" },
      });
      courseId = enr?.courseId ?? null;
    }

    const now = new Date();
    const status = this.isLate(now, shiftStart)
      ? AttendanceStatus.LATE
      : AttendanceStatus.PRESENT;

    const includeFull = {
      course: true,
      user: {
        include: {
          enrollments: {
            include: {
              course: { select: { id: true, title: true, category: true } },
            },
          },
        },
      },
    } as const;

    if (existing) {
      return this.map(
        await this.prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            checkInAt: now,
            checkOutAt: null,
            status,
            courseId,
            checkInLat: opts?.lat ?? null,
            checkInLng: opts?.lng ?? null,
            checkInDistance: distance,
            autoCheckout: false,
            shiftStart,
            shiftEnd,
          },
          include: includeFull,
        }),
      );
    }

    const row = await this.prisma.attendanceRecord.create({
      data: {
        userId,
        courseId,
        date,
        checkInAt: now,
        status,
        source: "APP",
        checkInLat: opts?.lat ?? null,
        checkInLng: opts?.lng ?? null,
        checkInDistance: distance,
        shiftStart,
        shiftEnd,
      },
      include: includeFull,
    });

    await this.notifications.notifyAdmins({
      title:
        status === AttendanceStatus.LATE
          ? "Late attendance"
          : "Attendance update",
      body:
        status === AttendanceStatus.LATE
          ? `${row.user.fullName} checked in late`
          : `${row.user.fullName} checked in`,
      type: "ATTENDANCE",
      data: {
        attendanceId: row.id,
        personId: userId,
        status,
      },
    });

    return this.map(row);
  }

  async checkOut(userId: string) {
    const date = this.todayDate();
    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { userId, date },
    });
    if (!existing?.checkInAt) {
      throw new BadRequestException("Check in first");
    }
    if (existing.checkOutAt) {
      throw new BadRequestException("Already checked out");
    }
    return this.map(
      await this.prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          checkOutAt: new Date(),
          status: AttendanceStatus.CHECKED_OUT,
          autoCheckout: false,
        },
        include: {
          course: true,
          user: {
            include: {
              enrollments: {
                include: {
                  course: { select: { id: true, title: true, category: true } },
                },
              },
            },
          },
        },
      }),
    );
  }

  async todayFor(userId: string) {
    const date = this.todayDate();
    const row = await this.prisma.attendanceRecord.findFirst({
      where: { userId, date },
      include: { course: true, user: true },
    });
    return row ? this.map(row) : null;
  }

  /** Verify geofence distance (for the Flutter app to check before showing check-in button). */
  async verifyLocation(userId: string, lat: number, lng: number) {
    const config = await this.system.getOfficeConfig();
    const distance = haversine(lat, lng, config.latitude, config.longitude);
    const inside = distance <= config.radiusMeters;
    return {
      inside,
      distance: Math.round(distance),
      radius: config.radiusMeters,
      officeLat: config.latitude,
      officeLng: config.longitude,
    };
  }

  /** Process arrival reminder — at most one per user per local calendar day. */
  async processArrivalReminder(userId: string, lat: number, lng: number) {
    const config = await this.system.getOfficeConfig();
    const distance = haversine(lat, lng, config.latitude, config.longitude);
    if (distance > config.radiusMeters) {
      return { inside: false, reminderSent: false };
    }

    const today = this.todayDate();

    // Check if already reminded today
    const alreadyReminded = await this.prisma.attendanceReminder.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (alreadyReminded) {
      return { inside: true, reminderSent: false };
    }

    // Create the reminder log (atomic — unique constraint prevents duplicates)
    try {
      await this.prisma.attendanceReminder.create({
        data: { userId, date: today },
      });
    } catch {
      // Already created by a concurrent request
      return { inside: true, reminderSent: false };
    }

    await this.notifications.notifyUser({
      userId,
      title: "Attendance reminder",
      body: "You are at the office. Check in now — you can mark attendance from the Attend tab.",
      type: "ATTENDANCE",
      data: { event: "arrival_reminder" },
    });

    return { inside: true, reminderSent: true };
  }

  /**
   * Auto-checkout: close all open attendance records whose scheduled shift end
   * has passed. This runs every 60 seconds via setInterval and is idempotent.
   */
  async runAutoCheckout() {
    const today = this.todayDate();
    const now = new Date();

    // Find all open records (checked in but not checked out) for today
    const openRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        checkInAt: { not: null },
        checkOutAt: null,
        date: today,
      },
      include: { user: true },
    });

    for (const record of openRecords) {
      let shiftEndStr = record.shiftEnd;
      if (!shiftEndStr) {
        const shift = await this.system.resolveShiftTimes(record.userId);
        shiftEndStr = shift.endTime;
      }

      const [h, m] = shiftEndStr.split(":").map(Number);
      const shiftEndDate = new Date(today);
      shiftEndDate.setHours(h ?? 17, m ?? 0, 0, 0);

      if (now >= shiftEndDate) {
        await this.prisma.attendanceRecord.update({
          where: { id: record.id },
          data: {
            checkOutAt: shiftEndDate,
            status: AttendanceStatus.CHECKED_OUT,
            autoCheckout: true,
          },
        });

        await this.notifications.notifyUser({
          userId: record.userId,
          title: "Auto checkout",
          body: "Your attendance was checked out automatically at shift end.",
          type: "ATTENDANCE",
          data: { event: "auto_checkout", attendanceId: record.id },
        });
      }
    }

    const staleRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        checkInAt: { not: null },
        checkOutAt: null,
        date: { lt: today },
      },
    });

    for (const record of staleRecords) {
      let shiftEndStr = record.shiftEnd;
      if (!shiftEndStr) {
        const shift = await this.system.resolveShiftTimes(record.userId);
        shiftEndStr = shift.endTime;
      }

      const [h, m] = shiftEndStr.split(":").map(Number);
      const shiftEndDate = new Date(record.date);
      shiftEndDate.setHours(h ?? 17, m ?? 0, 0, 0);

      await this.prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          checkOutAt: shiftEndDate,
          status: AttendanceStatus.CHECKED_OUT,
          autoCheckout: true,
        },
      });
    }
  }

  private formatDuration(minutes: number | null): string | null {
    if (minutes == null || minutes < 0) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h <= 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  }

  private durationMinutes(
    checkInAt: Date | null,
    checkOutAt: Date | null,
  ): number | null {
    if (!checkInAt) return null;
    const end = checkOutAt ?? new Date();
    return Math.max(0, Math.round((end.getTime() - checkInAt.getTime()) / 60000));
  }

  private mapAbsent(input: {
    userId: string;
    fullName: string;
    accountType: string;
    date: Date;
    courseId?: string | null;
    courseTitle?: string | null;
    courses?: { id: string; title: string; category: string }[];
  }) {
    return {
      id: `absent-${input.userId}-${input.date.toISOString().slice(0, 10)}`,
      personId: input.userId,
      personName: input.fullName,
      role: input.accountType,
      date: input.date.toISOString().slice(0, 10),
      markedAt: null,
      checkInAt: null,
      checkOutAt: null,
      status: "ABSENT",
      source: "BOARD",
      autoCheckout: false,
      shiftStart: null,
      shiftEnd: null,
      checkInLat: null,
      checkInLng: null,
      checkInDistance: null,
      courseId: input.courseId ?? null,
      courseTitle: input.courseTitle ?? null,
      courses: input.courses ?? [],
      durationMinutes: null,
      durationLabel: null,
      note: "No check-in today",
      stillInOffice: false,
    };
  }

  private map(r: {
    id: string;
    userId: string;
    date: Date;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    status: AttendanceStatus;
    source: string;
    autoCheckout: boolean;
    shiftStart: string | null;
    shiftEnd: string | null;
    checkInLat: number | null;
    checkInLng: number | null;
    checkInDistance: number | null;
    courseId?: string | null;
    course: { id?: string; title: string } | null;
    user: {
      fullName: string;
      accountType: string;
      enrollments?: {
        course: { id: string; title: string; category: string };
      }[];
    };
  }) {
    const mins = this.durationMinutes(r.checkInAt, r.checkOutAt);
    const stillIn =
      Boolean(r.checkInAt) && !r.checkOutAt && r.status !== AttendanceStatus.ABSENT;
    const enrolled =
      r.user.enrollments?.map((e) => ({
        id: e.course.id,
        title: e.course.title,
        category: e.course.category,
      })) ?? [];
    let note: string | null = null;
    if (r.autoCheckout) {
      note = r.shiftEnd
        ? `Auto checkout at ${r.shiftEnd}`
        : "Auto checkout at shift end";
    } else if (stillIn) {
      note = "Still in office";
    }

    return {
      id: r.id,
      personId: r.userId,
      personName: r.user.fullName,
      role: r.user.accountType,
      date: r.date.toISOString().slice(0, 10),
      markedAt: (r.checkInAt ?? r.date).toISOString(),
      checkInAt: r.checkInAt?.toISOString() ?? null,
      checkOutAt: r.checkOutAt?.toISOString() ?? null,
      status: r.status,
      source: r.source,
      autoCheckout: r.autoCheckout,
      shiftStart: r.shiftStart,
      shiftEnd: r.shiftEnd,
      checkInLat: r.checkInLat,
      checkInLng: r.checkInLng,
      checkInDistance: r.checkInDistance,
      courseId: r.courseId ?? r.course?.id ?? null,
      courseTitle:
        r.course?.title ??
        (enrolled.length === 1 ? enrolled[0].title : null),
      courses: enrolled,
      durationMinutes: mins,
      durationLabel: this.formatDuration(mins),
      note,
      stillInOffice: stillIn,
    };
  }
}
