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
    await this.getById(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        status: dto.status,
        designation: dto.designation,
        departmentId: dto.departmentId === undefined ? undefined : dto.departmentId,
        batchId: dto.batchId === undefined ? undefined : dto.batchId,
      },
      include: {
        roles: { include: { role: true } },
        department: true,
        batch: true,
      },
    });
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
