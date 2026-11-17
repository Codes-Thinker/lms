import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "crypto";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AcceptInvitationDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from "./auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService
  ) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private accessExpiresIn(): string {
    return this.config.get<string>("JWT_EXPIRES_IN") ?? "12h";
  }

  private refreshTtlMs(): number {
    const days = Number(this.config.get("REFRESH_TOKEN_DAYS") ?? 14);
    return Math.max(1, days) * 24 * 60 * 60 * 1000;
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(48).toString("hex");
    const tokenHash = this.hashToken(raw);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + this.refreshTtlMs()),
      },
    });
    return raw;
  }

  private async revokeUserRefreshTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async signUser(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        department: true,
        batch: true,
      },
    });
    const roles = user.roles.map((r) => r.role.code);
    const payload = {
      sub: user.id,
      email: user.email,
      accountType: user.accountType,
      roles,
    };
    const expiresIn = this.accessExpiresIn();
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_SECRET"),
      expiresIn: expiresIn as `${number}h` | `${number}d`,
    });
    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        name: user.fullName,
        fullName: user.fullName,
        email: user.email,
        role: user.accountType,
        accountType: user.accountType,
        status: user.status,
        track: user.track,
        phone: user.phone,
        profileImage: user.profileImage,
        department: user.department?.name ?? null,
        batch: user.batch?.code ?? null,
        roles,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { roles: { include: { role: true } } },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException("Invalid email or password");

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.signUser(user.id);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
    // Rotate: revoke old, issue new pair
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return this.signUser(row.userId);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.revokeUserRefreshTokens(userId);
    }
    return { ok: true };
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const tokenHash = this.hashToken(dto.token);
    const invitation = await this.prisma.invitation.findFirst({
      where: { tokenHash, usedAt: null, revokedAt: null },
      include: { user: true },
    });
    if (!invitation) {
      throw new BadRequestException("Invalid or used invitation");
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Invitation has expired");
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: invitation.userId },
        data: {
          passwordHash,
          status: AccountStatus.ACTIVE,
          activatedAt: new Date(),
        },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return this.signUser(invitation.userId);
  }

  /**
   * Always returns ok (no email enumeration). Sends mail only if account exists.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.passwordHash && user.status === AccountStatus.ACTIVE) {
      const raw = randomBytes(32).toString("hex");
      const hours = Number(this.config.get("PASSWORD_RESET_TTL_HOURS") ?? 2);
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(raw),
          expiresAt: new Date(Date.now() + Math.max(1, hours) * 3600_000),
        },
      });
      const appUrl = (
        this.config.get<string>("APP_URL") ?? "http://localhost:3000"
      ).replace(/\/$/, "");
      const resetLink = `${appUrl}/reset-password?token=${raw}`;
      await this.mail.sendPasswordReset({
        fullName: user.fullName,
        email: user.email,
        resetLink,
      });
    }
    return {
      ok: true,
      message:
        "If that email is registered, a password reset link has been sent.",
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const row = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null },
    });
    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ]);
    await this.revokeUserRefreshTokens(row.userId);

    return { ok: true, message: "Password updated. You can sign in now." };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        department: true,
        batch: true,
      },
    });
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      accountType: user.accountType,
      status: user.status,
      designation: user.designation,
      phone: user.phone,
      track: user.track,
      profileImage: user.profileImage,
      department: user.department,
      batch: user.batch,
      roles: user.roles.map((r) => r.role.code),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
