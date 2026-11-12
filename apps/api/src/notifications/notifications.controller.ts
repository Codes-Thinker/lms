import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsOptional, IsString, MinLength } from "class-validator";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { NotificationsService } from "./notifications.service";
import { PushService } from "./push.service";

class RegisterDeviceDto {
  @IsString()
  @MinLength(10)
  token!: string;

  @IsOptional()
  @IsString()
  platform?: string;
}

@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly push: PushService
  ) {}

  @Get("me")
  mine(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user.sub);
  }

  @Get()
  @Roles("SUPER_ADMIN", "STAFF")
  all() {
    return this.notifications.list();
  }

  @Post("device")
  registerDevice(
    @CurrentUser() user: AuthUser,
    @Body() body: RegisterDeviceDto
  ) {
    return this.push.registerDevice(
      user.sub,
      body.token,
      body.platform ?? "android"
    );
  }

  @Post("device/remove")
  removeDevice(@Body() body: RegisterDeviceDto) {
    return this.push.unregisterDevice(body.token);
  }

  @Post("read-all")
  markAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.sub);
  }

  @Post(":id/read")
  markRead(@Param("id") id: string) {
    return this.notifications.markRead(id);
  }
}
