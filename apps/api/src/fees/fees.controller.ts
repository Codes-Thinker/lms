import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { FeeStatus } from "@prisma/client";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { FeesService } from "./fees.service";

@Controller("fees")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeesController {
  constructor(private readonly fees: FeesService) {}

  @Get("payment-info")
  paymentInfo() {
    return this.fees.paymentInfo();
  }

  @Get("me")
  my(@CurrentUser() user: AuthUser) {
    return this.fees.list(user.sub);
  }

  @Get()
  @Roles("SUPER_ADMIN", "STAFF")
  list() {
    return this.fees.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.fees.get(id);
  }

  @Patch(":id/status")
  @Roles("SUPER_ADMIN", "STAFF")
  status(@Param("id") id: string, @Body() body: { status: FeeStatus }) {
    return this.fees.updateStatus(id, body.status);
  }

  @Post(":id/messages")
  message(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { text: string; hasScreenshot?: boolean }
  ) {
    const isAdmin =
      user.accountType === "SUPER_ADMIN" || user.roles?.includes("SUPER_ADMIN");
    return this.fees.addMessage(id, {
      senderId: user.sub,
      senderName: user.email,
      senderRole: isAdmin ? "ADMIN" : user.accountType,
      text: body.text,
      hasScreenshot: body.hasScreenshot,
    });
  }

  @Post(":id/remind")
  @Roles("SUPER_ADMIN", "STAFF")
  remind(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.fees.remind(id, user.email, user.sub);
  }
}
