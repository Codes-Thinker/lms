import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AccountStatus,
  AccountType,
  NotificationType,
  Prisma,
} from "@prisma/client";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "crypto";
import { MailService } from "../mail/mail.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from "./users.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService
  ) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private roleCodeFor(accountType: AccountType): string {
    switch (accountType) {
      case AccountType.SUPER_ADMIN:
        return "SUPER_ADMIN";
      case AccountType.STAFF:
        return "STAFF";
      case AccountType.STUDENT:
        return "STUDENT";
      case AccountType.INTERN:
        return "INTERN";
      default:
        return "STUDENT";
    }
  }

  private invitationLink(token: string): string {
    const appUrl = (this.config.get<string>("APP_URL") ?? "http://localhost:3000").replace(
      /\/$/,
      ""
    );
    return `${appUrl}/accept-invitation?token=${encodeURIComponent(token)}`;
  }

  private async createInvitation(userId: string, createdById?: string) {
    const ttlHours = Number(this.config.get("INVITATION_TTL_HOURS") ?? 24);
    const token = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    await this.prisma.invitation.updateMany({
      where: { userId, usedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.prisma.invitation.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        createdById,
      },
    });

    return { token, expiresAt };
  }

  async list(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where: Prisma.UserWhereInput = {};
    if (query.accountType) where.accountType = query.accountType;
    if (query.status) where.status = query.status;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          roles: { include: { role: true } },
          department: true,
          batch: true,
          invitations: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items: items.map((u) => ({
        id: u.id,
        name: u.fullName,
        fullName: u.fullName,
        email: u.email,
        role: u.accountType,
        accountType: u.accountType,
        status: u.status,
        designation: u.designation,
        phone: u.phone,
        track: u.track,
        profileImage: u.profileImage,
        monthlyFee: u.monthlyFee,
        feeStartDate: u.feeStartDate,
        feeDueDay: u.feeDueDay,
        department: u.department?.name ?? u.department,
        departmentId: u.departmentId,
        batch: u.batch?.code ?? u.batch,
        batchId: u.batchId,
        roles: u.roles.map((r) => r.role.code),
        invitedAt: u.invitedAt,
        activatedAt: u.activatedAt,
        lastLoginAt: u.lastLoginAt,
        latestInvitation: u.invitations[0]
          ? {
              id: u.invitations[0].id,
              expiresAt: u.invitations[0].expiresAt,
              usedAt: u.invitations[0].usedAt,
              revokedAt: u.invitations[0].revokedAt,
              sentAt: u.invitations[0].sentAt,
            }
          : null,
        createdAt: u.createdAt,
      })),
    };
  }

  async getById(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        department: true,
        batch: true,
        invitations: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    if (!u) throw new NotFoundException("User not found");
    return {
      id: u.id,
      name: u.fullName,
      fullName: u.fullName,
      email: u.email,
      role: u.accountType,
      accountType: u.accountType,
      status: u.status,
      designation: u.designation,
      phone: u.phone,
      track: u.track,
      profileImage: u.profileImage,
      monthlyFee: u.monthlyFee,
      feeStartDate: u.feeStartDate,
      feeDueDay: u.feeDueDay,
      department: u.department?.name ?? null,
      departmentId: u.departmentId,
      batch: u.batch?.code ?? null,
      batchId: u.batchId,
      roles: u.roles.map((r) => r.role.code),
      invitedAt: u.invitedAt,
      activatedAt: u.activatedAt,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      invitations: u.invitations,
    };
  }

  /** Comprehensive student detail for the admin dashboard. */
  async getStudentDetail(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        department: true,
        batch: true,
        enrollments: {
          include: {
            course: {
              include: {
                sections: { include: { topics: true } },
              },
            },
          },
        },
        attendanceRecords: {
          include: { course: true },
          orderBy: { date: "desc" },
          take: 30,
        },
        assignedTasks: {
          include: {
            course: { select: { title: true } },
            createdBy: { select: { fullName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        feeCases: {
          include: { messages: { orderBy: { createdAt: "asc" } } },
          orderBy: { dueDate: "desc" },
        },
        staffSchedule: true,
      },
    });
    if (!u) throw new NotFoundException("User not found");

    // Compute topic progress per enrollment
    const progress = await this.prisma.topicProgress.findMany({
      where: { userId: id, completed: true },
      select: { topicId: true },
    });
    const completedIds = new Set(progress.map((p) => p.topicId));

    const enrolledCourses = u.enrollments.map((enr) => {
      const topics = enr.course.sections.flatMap((s) => s.topics);
      const done = topics.filter((t) => completedIds.has(t.id)).length;
      return {
        id: enr.course.id,
        title: enr.course.title,
        category: enr.course.category,
        enrolledAt: enr.enrolledAt.toISOString().slice(0, 10),
        feeStatus: enr.feeStatus,
        paidAmount: enr.paidAmount,
        monthlyFee: enr.course.monthlyFee,
        totalFee: enr.course.totalFee,
        progressPercent: topics.length === 0 ? 0 : Math.round((done / topics.length) * 100),
        topicsDone: done,
        topicsTotal: topics.length,
      };
    });

    const attendance = u.attendanceRecords.map((r) => {
      const checkIn = r.checkInAt;
      const checkOut = r.checkOutAt;
      let durationMinutes: number | null = null;
      if (checkIn && checkOut) {
        durationMinutes = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
      }
      return {
        id: r.id,
        date: r.date.toISOString().slice(0, 10),
        checkInAt: checkIn?.toISOString() ?? null,
        checkOutAt: checkOut?.toISOString() ?? null,
        status: r.status,
        autoCheckout: r.autoCheckout,
        durationMinutes,
        shiftStart: r.shiftStart,
        shiftEnd: r.shiftEnd,
        courseTitle: r.course?.title ?? null,
      };
    });

    const tasks = u.assignedTasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      courseTitle: t.course?.title ?? null,
      assignedBy: t.createdBy?.fullName ?? null,
      dueAt: t.dueAt?.toISOString() ?? null,
      submittedAt: t.submittedAt?.toISOString() ?? null,
      reviewStatus: t.reviewStatus,
      feedback: t.feedback,
      createdAt: t.createdAt.toISOString(),
    }));

    const fees = u.feeCases.map((f) => ({
      id: f.id,
      courseTitle: f.courseTitle,
      month: f.month,
      amount: f.amount,
      status: f.status,
      dueDate: f.dueDate.toISOString().slice(0, 10),
      monthlyFee: f.monthlyFee,
      paymentSubmittedAt: f.paymentSubmittedAt?.toISOString() ?? null,
      rejectionReason: f.rejectionReason,
      messages: f.messages.map((m) => ({
        id: m.id,
        senderName: m.senderName,
        senderRole: m.senderRole,
        text: m.text,
        hasScreenshot: m.hasScreenshot,
        sentAt: m.createdAt.toISOString(),
      })),
    }));

    const outstandingAmount = u.feeCases
      .filter((f) => f.status !== "PAID")
      .reduce((sum, f) => sum + f.amount, 0);

    // Today's attendance summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRecord = u.attendanceRecords.find((r) => {
      const rDate = new Date(r.date);
      rDate.setHours(0, 0, 0, 0);
      return rDate.getTime() === today.getTime();
    });

    return {
      id: u.id,
      name: u.fullName,
      fullName: u.fullName,
      email: u.email,
      role: u.accountType,
      accountType: u.accountType,
      status: u.status,
      designation: u.designation,
      phone: u.phone,
      track: u.track,
      profileImage: u.profileImage,
      department: u.department?.name ?? null,
      batch: u.batch?.code ?? null,
      roles: u.roles.map((r) => r.role.code),
      createdAt: u.createdAt,
      monthlyFee: u.monthlyFee,
      feeStartDate: u.feeStartDate,
      feeDueDay: u.feeDueDay,
      // Sections
      personalInfo: {
        name: u.fullName,
        email: u.email,
        phone: u.phone,
        status: u.status,
        designation: u.designation,
        track: u.track,
        department: u.department?.name ?? null,
        batch: u.batch?.code ?? null,
        profileImage: u.profileImage,
        createdAt: u.createdAt.toISOString().slice(0, 10),
      },
      enrolledCourses,
      attendanceHistory: attendance,
      assignments: tasks,
      feeHistory: fees,
      outstandingAmount,
      todayAttendance: todayRecord
        ? {
            checkInAt: todayRecord.checkInAt?.toISOString() ?? null,
            checkOutAt: todayRecord.checkOutAt?.toISOString() ?? null,
            status: todayRecord.status,
            autoCheckout: todayRecord.autoCheckout,
          }
        : null,
      schedule: u.staffSchedule
        ? { startTime: u.staffSchedule.startTime, endTime: u.staffSchedule.endTime }
        : null,
    };
  }

  async create(dto: CreateUserDto, createdById?: string) {
    if (dto.accountType === AccountType.SUPER_ADMIN) {
      throw new BadRequestException("Cannot invite SUPER_ADMIN via this endpoint");
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Email already registered");

    const role = await this.prisma.role.findUnique({
      where: { code: this.roleCodeFor(dto.accountType) },
    });
    if (!role) throw new BadRequestException("Role missing — run seed");

    const hasPassword = Boolean(dto.password?.trim());
    const passwordHash = hasPassword
      ? await argon2.hash(dto.password!.trim(), { type: argon2.argon2id })
      : null;

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        passwordHash,
        accountType: dto.accountType,
        status: hasPassword ? AccountStatus.ACTIVE : AccountStatus.INVITED,
        designation: dto.designation,
        phone: dto.phone,
        track: dto.track,
        departmentId: dto.departmentId,
        batchId: dto.batchId,
        createdById,
        invitedAt: hasPassword ? null : new Date(),
        activatedAt: hasPassword ? new Date() : null,
        roles: { create: { roleId: role.id } },
      },
    });

    const send = !hasPassword && dto.sendInvitation !== false;
    let invitationMeta: { expiresAt: Date } | null = null;
    if (send) {
      const { token, expiresAt } = await this.createInvitation(user.id, createdById);
      await this.mail.sendInvitation({
        fullName: user.fullName,
        email: user.email,
        accountType: user.accountType,
        invitationLink: this.invitationLink(token),
      });
      invitationMeta = { expiresAt };
    }

    return { user: await this.getById(user.id), invitation: invitationMeta };
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("User not found");

    if (dto.email) {
      const email = dto.email.toLowerCase().trim();
      const clash = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (clash) throw new ConflictException("Email already registered");
    }

    if (dto.accountType === AccountType.SUPER_ADMIN) {
      throw new BadRequestException("Cannot set SUPER_ADMIN via this endpoint");
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.email !== undefined) data.email = dto.email.toLowerCase().trim();
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.designation !== undefined) data.designation = dto.designation;
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.track !== undefined) data.track = dto.track?.trim() || null;
    if (dto.profileImage !== undefined) data.profileImage = dto.profileImage;
    if (dto.monthlyFee !== undefined) data.monthlyFee = dto.monthlyFee;
    if (dto.feeStartDate !== undefined) {
      data.feeStartDate = dto.feeStartDate ? new Date(dto.feeStartDate) : null;
    }
    if (dto.feeDueDay !== undefined) data.feeDueDay = dto.feeDueDay;
    if (dto.departmentId !== undefined) {
      data.department = dto.departmentId
        ? { connect: { id: dto.departmentId } }
        : { disconnect: true };
    }
    if (dto.batchId !== undefined) {
      data.batch = dto.batchId
        ? { connect: { id: dto.batchId } }
        : { disconnect: true };
    }
    if (dto.password?.trim()) {
      data.passwordHash = await argon2.hash(dto.password.trim(), {
        type: argon2.argon2id,
      });
      if (existing.status !== AccountStatus.ACTIVE) {
        data.status = AccountStatus.ACTIVE;
        data.activatedAt = new Date();
      }
    }

    if (dto.accountType && dto.accountType !== existing.accountType) {
      data.accountType = dto.accountType;
      const role = await this.prisma.role.findUnique({
        where: { code: this.roleCodeFor(dto.accountType) },
      });
      if (role) {
        await this.prisma.userRole.deleteMany({ where: { userId: id } });
        await this.prisma.userRole.create({
          data: { userId: id, roleId: role.id },
        });
      }
    }

    await this.prisma.user.update({ where: { id }, data });

    if (dto.courseIds !== undefined) {
      const wanted = Array.from(
        new Set(dto.courseIds.filter((x) => typeof x === "string" && x.trim()))
      );
      const current = await this.prisma.enrollment.findMany({
        where: { userId: id },
        select: { courseId: true },
      });
      const currentIds = new Set(current.map((c) => c.courseId));
      const wantedSet = new Set(wanted);
      const toRemove = [...currentIds].filter((cid) => !wantedSet.has(cid));
      const toAdd = wanted.filter((cid) => !currentIds.has(cid));
      if (toRemove.length) {
        await this.prisma.enrollment.deleteMany({
          where: { userId: id, courseId: { in: toRemove } },
        });
      }
      for (const courseId of toAdd) {
        const course = await this.prisma.course.findUnique({
          where: { id: courseId },
        });
        if (!course) continue;
        await this.prisma.enrollment.create({
          data: { userId: id, courseId },
        });
      }
    }

    return this.getById(id);
  }

  async resendInvitation(id: string, createdById?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    if (user.status === AccountStatus.ACTIVE && user.passwordHash) {
      throw new BadRequestException("User already activated");
    }

    const { token, expiresAt } = await this.createInvitation(user.id, createdById);
    await this.prisma.user.update({
      where: { id },
      data: { status: AccountStatus.INVITED, invitedAt: new Date() },
    });
    await this.mail.sendInvitation({
      fullName: user.fullName,
      email: user.email,
      accountType: user.accountType,
      invitationLink: this.invitationLink(token),
    });

    return { ok: true, expiresAt };
  }

  /**
   * Hard-delete a user and all account-owned data.
   * Login with that email/password will fail afterwards (user row gone).
   */
  async purgeUser(
    id: string,
    opts: { actorId: string; selfRequested: boolean }
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    if (user.accountType === AccountType.SUPER_ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { accountType: AccountType.SUPER_ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          "Cannot delete the last super admin account"
        );
      }
      if (opts.selfRequested) {
        throw new ForbiddenException(
          "Super admin cannot self-delete from the app"
        );
      }
    }

    const label = `${user.fullName} (${user.email})`;
    const accountType = user.accountType;

    if (opts.selfRequested) {
      await this.notifications.notifyAdmins({
        title: "Account deleted",
        body: `${label} deleted their account from the app. All of their data was removed.`,
        type: NotificationType.SYSTEM,
        data: {
          kind: "ACCOUNT_DELETED",
          email: user.email,
          accountType,
        },
      });
    } else if (opts.actorId !== id) {
      await this.notifications.notifyAdmins({
        title: "User removed by admin",
        body: `${label} was permanently deleted from the dashboard.`,
        type: NotificationType.SYSTEM,
        data: {
          kind: "ACCOUNT_DELETED",
          email: user.email,
          accountType,
          byAdminId: opts.actorId,
        },
      });
    }

    await this.prisma.$transaction(async (tx) => {
      // Break non-cascade FKs first
      await tx.user.updateMany({
        where: { createdById: id },
        data: { createdById: null },
      });
      await tx.feeMessage.updateMany({
        where: { senderId: id },
        data: { senderId: null },
      });
      await tx.taskMessage.updateMany({
        where: { senderId: id },
        data: { senderId: null },
      });
      await tx.chatMessage.updateMany({
        where: { senderId: id },
        data: { senderId: null },
      });
      await tx.task.updateMany({
        where: { createdById: id },
        data: { createdById: null },
      });
      await tx.project.updateMany({
        where: { createdById: id },
        data: { createdById: null },
      });

      // Remove tasks assigned to this user (their work items)
      await tx.taskMessage.deleteMany({
        where: { task: { assigneeId: id } },
      });
      await tx.task.deleteMany({ where: { assigneeId: id } });

      // Cascades: roles, invitations, enrollments, progress, attendance,
      // fee cases (+ messages), projects, tickets, surveys, chats, FCM, notifications
      await tx.user.delete({ where: { id } });
    });

    return { ok: true, deletedId: id, email: user.email };
  }
}
