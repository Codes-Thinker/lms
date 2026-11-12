import { BadRequestException, Injectable } from "@nestjs/common";
import { AttendanceStatus } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  private todayDate(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private isLate(now: Date): boolean {
    return now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() > 5);
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

  async list(filters?: { date?: string; accountType?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.date) {
      const d = new Date(filters.date);
      d.setHours(0, 0, 0, 0);
      where.date = d;
    }
    if (filters?.accountType) {
      where.user = { accountType: filters.accountType };
    }
    const rows = await this.prisma.attendanceRecord.findMany({
      where,
      include: { course: true, user: true },
      orderBy: [{ date: "desc" }, { checkInAt: "desc" }],
      take: 200,
    });
    return rows.map((r) => this.map(r));
  }

  async checkIn(userId: string, courseId?: string) {
    const date = this.todayDate();
    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { userId, date },
    });
    if (existing?.checkInAt && !existing.checkOutAt) {
      throw new BadRequestException("Already checked in");
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
            courseId: courseId ?? existing.courseId,
          },
          include: { course: true, user: true },
        })
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
        },
        include: { course: true, user: true },
      })
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

  private map(r: {
    id: string;
    userId: string;
    date: Date;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    status: AttendanceStatus;
    source: string;
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
      courseTitle: r.course?.title ?? null,
    };
  }
}
