import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  CurrentUser,
  AuthUser,
} from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import {
  AcceptInvitationDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
} from "./auth.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Stricter than global 120/min — slows credential stuffing. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser() user: AuthUser,
    @Body() body: { refreshToken?: string }
  ) {
    return this.auth.logout(user.sub, body?.refreshToken);
  }

  @Post("accept-invitation")
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.auth.acceptInvitation(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.sub);
  }
}
