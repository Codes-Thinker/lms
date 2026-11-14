import {
  BadRequestException,
  ForbiddenException,
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
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private isLate(now: Date): boolean {
    return (
      now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() > 5)
    );
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
    const rows = await this.prisma.attendanceRecord.findMany({
      where,
      include: { course: true, user: true },
      orderBy: [{ date: "desc" }, { checkInAt: "desc" }],
      take: 500,
    });
    return rows.map((r) => this.map(r));
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

    // Validate geofence if lat/lng provided
    let distance: number | null = null;
    let shiftStart: string | null = null;
    let shiftEnd: string | null = null;
    if (opts?.lat != null && opts?.lng != null) {
      const config = await this.system.getOfficeConfig();
      distance = haversine(
        opts.lat!,
        opts.lng!,
        config.latitude,
        config.longitude,
      );
      if (distance > config.radiusMeters) {
        throw new BadRequestException(
          `You must be within the office location to check in. You are ${Math.round(distance)}m away.`,
        );
      }
    }

    // Get shift info from schedule
    const schedule = await this.prisma.staffSchedule.findUnique({
      where: { userId },
    });
    if (schedule) {
      shiftStart = schedule.startTime;
      shiftEnd = schedule.endTime;
    }

    const now = new Date();
    const status = this.isLate(now)
      ? AttendanceStatus.LATE
      : AttendanceStatus.PRESENT;

    if (existing) {
      return this.map(
        await this.prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            checkInAt: now,
            checkOutAt: null,
            status,
            courseId: opts?.courseId ?? existing.courseId,
            checkInLat: opts?.lat ?? null,
            checkInLng: opts?.lng ?? null,
            checkInDistance: distance,
            autoCheckout: false,
            shiftStart,
            shiftEnd,
          },
          include: { course: true, user: true },
        }),
      );
    }

    const row = await this.prisma.attendanceRecord.create({
      data: {
        userId,
        courseId: opts?.courseId,
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
      include: { course: true, user: true },
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
        include: { course: true, user: true },
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

    // Send the notification
    await this.notifications.notifyUser({
      userId,
      title: "Office Arrival",
      body: "You have arrived at the office. Please remember to check in for today's attendance.",
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
      // Determine the scheduled shift end for this user
      let shiftEndStr = record.shiftEnd;
      if (!shiftEndStr) {
        const schedule = await this.prisma.staffSchedule.findUnique({
          where: { userId: record.userId },
        });
        shiftEndStr = schedule?.endTime ?? "17:00";
      }

      // Parse "HH:MM" and build today's checkout deadline
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
          title: "Auto Checkout",
          body: "Your attendance has been automatically checked out at your scheduled shift end time.",
          type: "ATTENDANCE",
          data: { event: "auto_checkout", attendanceId: record.id },
        });
      }
    }

    // Also check yesterday's open records (in case the server was down)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const staleRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        checkInAt: { not: null },
        checkOutAt: null,
        date: { lt: today },
      },
    });

    for (const record of staleRecords) {
      let shiftEndStr = record.shiftEnd ?? "17:00";
      if (!record.shiftEnd) {
        const schedule = await this.prisma.staffSchedule.findUnique({
          where: { userId: record.userId },
        });
        shiftEndStr = schedule?.endTime ?? "17:00";
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
    course: { title: string } | null;
    user: { fullName: string; accountType: string };
  }) {
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
      courseTitle: r.course?.title ?? null,
    };
  }
}
