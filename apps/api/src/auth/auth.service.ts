import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AcceptInvitationDto, LoginDto } from "./auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
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
    const expiresIn = this.config.get<string>("JWT_EXPIRES_IN") ?? "7d";
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_SECRET"),
      expiresIn: expiresIn as `${number}d`,
    });

    return {
      accessToken,
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
      throw new UnauthorizedException("No account found with this email");
    }
    if (user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException(
        "This account is not active. Please contact your admin."
      );
    }
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException("Incorrect password");

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.signUser(user.id);
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
      department: user.department,
      batch: user.batch,
      roles: user.roles.map((r) => r.role.code),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
