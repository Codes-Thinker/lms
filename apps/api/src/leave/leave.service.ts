import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AttendanceStatus, LeaveStatus, NotificationType } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

const MONTHLY_ALLOWANCE = 2;

type AuthActor = {
  sub: string;
  accountType: string;
  roles: string[];
};

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  private isAdmin(actor: AuthActor) {
    return (
      actor.accountType === "SUPER_ADMIN" ||
      actor.accountType === "STAFF" ||
      actor.roles?.includes("SUPER_ADMIN") ||
      actor.roles?.includes("STAFF")
    );
  }

  private monthBounds(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return { start, end };
  }

  private parseLeaveDate(raw: string) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
    if (!m) {
      throw new BadRequestException("leaveDate must be YYYY-MM-DD");
    }
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (
      dt.getUTCFullYear() !== y ||
      dt.getUTCMonth() !== mo - 1 ||
      dt.getUTCDate() !== d
    ) {
      throw new BadRequestException("Invalid leaveDate");
    }
    return dt;
  }

  private normalizeDuration(raw: unknown) {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (![0.5, 1, 1.5, 2].includes(n)) {
      throw new BadRequestException(
        "durationDays must be 0.5, 1, 1.5, or 2"
      );
    }
    return n;
  }

  private endExclusive(leaveDate: Date, durationDays: number) {
    const days = Math.ceil(durationDays);
    const end = new Date(leaveDate);
    end.setUTCDate(end.getUTCDate() + days);
    return end;
  }

  private rangesOverlap(
    aStart: Date,
    aDur: number,
    bStart: Date,
    bDur: number
  ) {
    const aEnd = this.endExclusive(aStart, aDur);
    const bEnd = this.endExclusive(bStart, bDur);
    return aStart < bEnd && bStart < aEnd;
  }

  private serialize(
    row: {
      id: string;
      studentId: string;
      leaveDate: Date;
      durationDays: number;
      reason: string;
      status: LeaveStatus;
      rejectionReason: string | null;
      reviewedById: string | null;
      reviewedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      student?: {
        id: string;
        fullName: string;
        email: string;
        batch?: { code: string; name: string } | null;
        enrollments?: {
          course: { id: string; title: string; batchLabel: string | null };
        }[];
      };
      reviewedBy?: { id: string; fullName: string } | null;
    }
  ) {
    const course =
      row.student?.enrollments?.[0]?.course ?? null;
    return {
      id: row.id,
      studentId: row.studentId,
      studentName: row.student?.fullName ?? null,
      studentEmail: row.student?.email ?? null,
      batch: row.student?.batch?.code ?? row.student?.batch?.name ?? null,
      courseId: course?.id ?? null,
      courseTitle: course?.title ?? null,
      leaveDate: row.leaveDate.toISOString().slice(0, 10),
      durationDays: row.durationDays,
      reason: row.reason,
      status: row.status,
      rejectionReason: row.rejectionReason,
      reviewedById: row.reviewedById,
      reviewedByName: row.reviewedBy?.fullName ?? null,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private readonly includeStudent = {
    student: {
      select: {
        id: true,
        fullName: true,
        email: true,
        batch: { select: { code: true, name: true } },
        enrollments: {
          take: 1,
          orderBy: { enrolledAt: "desc" as const },
          select: {
            course: {
              select: { id: true, title: true, batchLabel: true },
            },
          },
        },
      },
    },
    reviewedBy: { select: { id: true, fullName: true } },
  };

  async balanceForStudent(
    studentId: string,
    year?: number,
    month?: number
  ) {
    const now = new Date();
    const y = year ?? now.getUTCFullYear();
    const m = month ?? now.getUTCMonth() + 1;
    if (m < 1 || m > 12) {
      throw new BadRequestException("month must be 1-12");
    }
    const { start, end } = this.monthBounds(y, m);
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        studentId,
        leaveDate: { gte: start, lt: end },
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
      },
      select: { status: true, durationDays: true },
    });
    let used = 0;
    let pending = 0;
    for (const r of rows) {
      if (r.status === LeaveStatus.APPROVED) used += r.durationDays;
      else pending += r.durationDays;
    }
    const remaining = Math.max(0, MONTHLY_ALLOWANCE - used - pending);
    return {
      studentId,
      year: y,
      month: m,
      totalAllowance: MONTHLY_ALLOWANCE,
      usedLeaves: Number(used.toFixed(2)),
      pendingLeaves: Number(pending.toFixed(2)),
      remainingLeaves: Number(remaining.toFixed(2)),
    };
  }

  async myHistory(studentId: string) {
    const rows = await this.prisma.leaveRequest.findMany({
      where: { studentId },
      include: this.includeStudent,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.serialize(r));
  }

  async getOne(id: string, actor: AuthActor) {
    const row = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: this.includeStudent,
    });
    if (!row) throw new NotFoundException("Leave request not found");
    if (!this.isAdmin(actor) && row.studentId !== actor.sub) {
      throw new ForbiddenException("Not allowed");
    }
    return this.serialize(row);
  }

  async submit(
    studentId: string,
    body: { leaveDate: string; durationDays: number; reason: string }
  ) {
    const leaveDate = this.parseLeaveDate(body.leaveDate);
    const durationDays = this.normalizeDuration(body.durationDays);
    const reason = (body.reason ?? "").trim();
    if (reason.length < 3) {
      throw new BadRequestException("reason must be at least 3 characters");
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true, accountType: true },
    });
    if (!student) throw new NotFoundException("Student not found");
    if (student.accountType !== "STUDENT" && student.accountType !== "INTERN") {
      throw new ForbiddenException("Only students can request leave");
    }

    const year = leaveDate.getUTCFullYear();
    const month = leaveDate.getUTCMonth() + 1;

    const created = await this.prisma.$transaction(async (tx) => {
      const { start, end } = this.monthBounds(year, month);
      const existing = await tx.leaveRequest.findMany({
        where: {
          studentId,
          status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
          leaveDate: {
            gte: new Date(Date.UTC(year, month - 2, 1)),
            lt: new Date(Date.UTC(year, month + 1, 1)),
          },
        },
      });

      let used = 0;
      let pending = 0;
      for (const r of existing) {
        if (
          r.leaveDate >= start &&
          r.leaveDate < end
        ) {
          if (r.status === LeaveStatus.APPROVED) used += r.durationDays;
          else pending += r.durationDays;
        }
        if (
          this.rangesOverlap(
            leaveDate,
            durationDays,
            r.leaveDate,
            r.durationDays
          )
        ) {
          throw new BadRequestException(
            "Overlapping leave request already exists for these dates"
          );
        }
      }

      const remaining = MONTHLY_ALLOWANCE - used - pending;
      if (durationDays > remaining + 1e-9) {
        throw new BadRequestException(
          `Insufficient leave balance. Remaining: ${Number(remaining.toFixed(2))} day(s)`
        );
      }

      return tx.leaveRequest.create({
        data: {
          studentId,
          leaveDate,
          durationDays,
          reason,
          status: LeaveStatus.PENDING,
        },
        include: this.includeStudent,
      });
    });

    await this.notifications.notifyUser({
      userId: studentId,
      title: "Leave request submitted",
      body: `Your leave for ${created.leaveDate.toISOString().slice(0, 10)} (${durationDays} day(s)) is pending review.`,
      type: NotificationType.LEAVE,
      data: { leaveId: created.id, event: "leave_submitted" },
    });

    await this.notifications.notifyAdmins({
      title: "New leave request",
      body: `${student.fullName} requested ${durationDays} day(s) leave on ${created.leaveDate.toISOString().slice(0, 10)}.`,
      type: NotificationType.LEAVE,
      data: { leaveId: created.id, studentId, event: "leave_submitted" },
    });

    // Also notify active STAFF (HR / teachers), without duplicating SUPER_ADMIN.
    const staff = await this.prisma.user.findMany({
      where: {
        accountType: "STAFF",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    for (const s of staff) {
      await this.notifications.notifyUser({
        userId: s.id,
        title: "New leave request",
        body: `${student.fullName} requested ${durationDays} day(s) leave on ${created.leaveDate.toISOString().slice(0, 10)}.`,
        type: NotificationType.LEAVE,
        data: { leaveId: created.id, studentId, event: "leave_submitted" },
      });
    }

    return this.serialize(created);
  }

  async listAdmin(filters: {
    status?: string;
    batch?: string;
    from?: string;
    to?: string;
    studentId?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.status && filters.status !== "ALL") {
      const s = filters.status.toUpperCase();
      if (!["PENDING", "APPROVED", "REJECTED"].includes(s)) {
        throw new BadRequestException("Invalid status filter");
      }
      where.status = s as LeaveStatus;
    }
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.from || filters.to) {
      const leaveDate: { gte?: Date; lte?: Date } = {};
      if (filters.from) leaveDate.gte = this.parseLeaveDate(filters.from);
      if (filters.to) leaveDate.lte = this.parseLeaveDate(filters.to);
      where.leaveDate = leaveDate;
    }
    if (filters.batch) {
      where.student = {
        batch: {
          OR: [
            { code: { equals: filters.batch, mode: "insensitive" } },
            { name: { contains: filters.batch, mode: "insensitive" } },
          ],
        },
      };
    }

    const rows = await this.prisma.leaveRequest.findMany({
      where,
      include: this.includeStudent,
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return rows.map((r) => this.serialize(r));
  }

  async stats() {
    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.leaveRequest.count(),
      this.prisma.leaveRequest.count({ where: { status: LeaveStatus.PENDING } }),
      this.prisma.leaveRequest.count({
        where: { status: LeaveStatus.APPROVED },
      }),
      this.prisma.leaveRequest.count({
        where: { status: LeaveStatus.REJECTED },
      }),
    ]);
    return { total, pending, approved, rejected };
  }

  async approve(id: string, actor: AuthActor) {
    if (!this.isAdmin(actor)) throw new ForbiddenException("Not allowed");

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.leaveRequest.findUnique({ where: { id } });
      if (!row) throw new NotFoundException("Leave request not found");
      if (row.status !== LeaveStatus.PENDING) {
        throw new BadRequestException("Only pending requests can be approved");
      }

      const year = row.leaveDate.getUTCFullYear();
      const month = row.leaveDate.getUTCMonth() + 1;
      const { start, end } = this.monthBounds(year, month);
      const approved = await tx.leaveRequest.findMany({
        where: {
          studentId: row.studentId,
          status: LeaveStatus.APPROVED,
          leaveDate: { gte: start, lt: end },
        },
        select: { durationDays: true },
      });
      const used = approved.reduce((s, r) => s + r.durationDays, 0);
      if (used + row.durationDays > MONTHLY_ALLOWANCE + 1e-9) {
        throw new BadRequestException(
          "Approving would exceed the student's monthly leave allowance"
        );
      }

      const next = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveStatus.APPROVED,
          reviewedById: actor.sub,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
        include: this.includeStudent,
      });

      // Mark attendance LEAVE for each full calendar day covered.
      const dayCount = Math.ceil(row.durationDays);
      for (let i = 0; i < dayCount; i++) {
        const day = new Date(row.leaveDate);
        day.setUTCDate(day.getUTCDate() + i);
        const existing = await tx.attendanceRecord.findFirst({
          where: { userId: row.studentId, date: day },
        });
        if (existing) {
          await tx.attendanceRecord.update({
            where: { id: existing.id },
            data: { status: AttendanceStatus.LEAVE, source: "LEAVE" },
          });
        } else {
          await tx.attendanceRecord.create({
            data: {
              userId: row.studentId,
              date: day,
              status: AttendanceStatus.LEAVE,
              source: "LEAVE",
            },
          });
        }
      }

      return next;
    });

    await this.notifications.notifyUser({
      userId: updated.studentId,
      title: "Leave approved",
      body: `Your leave on ${updated.leaveDate.toISOString().slice(0, 10)} was approved.`,
      type: NotificationType.LEAVE,
      data: { leaveId: updated.id, event: "leave_approved" },
    });

    return this.serialize(updated);
  }

  async reject(id: string, actor: AuthActor, rejectionReason?: string) {
    if (!this.isAdmin(actor)) throw new ForbiddenException("Not allowed");
    const reason = (rejectionReason ?? "").trim();
    if (reason.length < 3) {
      throw new BadRequestException(
        "rejectionReason must be at least 3 characters"
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.leaveRequest.findUnique({ where: { id } });
      if (!row) throw new NotFoundException("Leave request not found");
      if (row.status !== LeaveStatus.PENDING) {
        throw new BadRequestException("Only pending requests can be rejected");
      }
      return tx.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveStatus.REJECTED,
          rejectionReason: reason,
          reviewedById: actor.sub,
          reviewedAt: new Date(),
        },
        include: this.includeStudent,
      });
    });

    await this.notifications.notifyUser({
      userId: updated.studentId,
      title: "Leave rejected",
      body: `Your leave on ${updated.leaveDate.toISOString().slice(0, 10)} was rejected: ${reason}`,
      type: NotificationType.LEAVE,
      data: {
        leaveId: updated.id,
        event: "leave_rejected",
        rejectionReason: reason,
      },
    });

    return this.serialize(updated);
  }
}
