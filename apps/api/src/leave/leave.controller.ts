import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { LeaveService } from "./leave.service";

@Controller("leave")
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  @Get("me/balance")
  myBalance(
    @CurrentUser() user: AuthUser,
    @Query("year") year?: string,
    @Query("month") month?: string
  ) {
    return this.leave.balanceForStudent(
      user.sub,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined
    );
  }

  @Get("me")
  myHistory(@CurrentUser() user: AuthUser) {
    return this.leave.myHistory(user.sub);
  }

  @Post("me")
  submit(
    @CurrentUser() user: AuthUser,
    @Body() body: { leaveDate: string; durationDays: number; reason: string }
  ) {
    return this.leave.submit(user.sub, body);
  }

  @Get("stats")
  @Roles("SUPER_ADMIN", "STAFF")
  stats() {
    return this.leave.stats();
  }

  @Get()
  @Roles("SUPER_ADMIN", "STAFF")
  list(
    @Query("status") status?: string,
    @Query("batch") batch?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("studentId") studentId?: string
  ) {
    return this.leave.listAdmin({ status, batch, from, to, studentId });
  }

  @Get(":id")
  getOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.leave.getOne(id, user);
  }

  @Patch(":id/approve")
  @Roles("SUPER_ADMIN", "STAFF")
  approve(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.leave.approve(id, user);
  }

  @Patch(":id/reject")
  @Roles("SUPER_ADMIN", "STAFF")
  reject(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { rejectionReason?: string }
  ) {
    return this.leave.reject(id, user, body?.rejectionReason);
  }
}
