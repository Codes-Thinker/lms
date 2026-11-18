import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { AttendanceService } from "./attendance.service";

@Controller("attendance")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get("me")
  my(@CurrentUser() user: AuthUser) {
    return this.attendance.myHistory(user.sub);
  }

  @Get("today")
  today(@CurrentUser() user: AuthUser) {
    return this.attendance.todayFor(user.sub);
  }

  @Get()
  @Roles("SUPER_ADMIN", "STAFF")
  list(
    @Query("date") date?: string,
    @Query("accountType") accountType?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("status") status?: string,
    @Query("courseId") courseId?: string,
  ) {
    return this.attendance.list({
      date,
      accountType,
      startDate,
      endDate,
      status,
      courseId,
    });
  }

  /** Admin dashboard board: course tabs + every enrolled student for the day. */
  @Get("board")
  @Roles("SUPER_ADMIN", "STAFF")
  board(
    @Query("date") date?: string,
    @Query("courseId") courseId?: string,
  ) {
    return this.attendance.board({ date, courseId });
  }

  @Post("check-in")
  checkIn(
    @CurrentUser() user: AuthUser,
    @Body() body: { courseId?: string; lat?: number; lng?: number },
  ) {
    return this.attendance.checkIn(user.sub, body);
  }

  @Post("check-out")
  checkOut(@CurrentUser() user: AuthUser) {
    return this.attendance.checkOut(user.sub);
  }

  /** Verify if the user is inside the geofence (Flutter uses this to enable/disable check-in). */
  @Post("verify-location")
  verifyLocation(
    @CurrentUser() user: AuthUser,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.attendance.verifyLocation(user.sub, body.lat, body.lng);
  }

  /** Process geofence arrival — sends at most one reminder per day. */
  @Post("arrival-reminder")
  arrivalReminder(
    @CurrentUser() user: AuthUser,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.attendance.processArrivalReminder(user.sub, body.lat, body.lng);
  }

  /** Left office while still checked in — remind to check out (once/day). */
  @Post("exit-reminder")
  exitReminder(
    @CurrentUser() user: AuthUser,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.attendance.processExitReminder(user.sub, body.lat, body.lng);
  }
}
