import {
  Body,
  Controller,
  Delete,
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
import { CoursesService } from "./courses.service";

@Controller("courses")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query("all") all?: string
  ) {
    const publishedOnly =
      all !== "1" || !["SUPER_ADMIN", "STAFF"].includes(user.accountType);
    return this.courses.list(user.sub, publishedOnly);
  }

  /** Teacher/staff: courses they instruct + enrolled students. */
  @Get("teaching/mine")
  @Roles("SUPER_ADMIN", "STAFF")
  myTeaching(@CurrentUser() user: AuthUser) {
    return this.courses.listTeachingRoster(user.sub, user.accountType);
  }

  /** Dynamic course categories from the database. */
  @Get("categories")
  categories() {
    return this.courses.categories();
  }

  /** Admin: list enrollment requests (optional courseId / status filters). */
  @Get("enrollment-requests")
  @Roles("SUPER_ADMIN", "STAFF")
  listEnrollmentRequests(
    @Query("courseId") courseId?: string,
    @Query("status") status?: string
  ) {
    return this.courses.listEnrollmentRequests(courseId, status);
  }

  @Get(":id/students")
  @Roles("SUPER_ADMIN", "STAFF")
  enrolledStudents(@Param("id") id: string) {
    return this.courses.listEnrolledStudents(id);
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.courses.get(id, user.sub);
  }

  /**
   * Get course content with enrollment-based access control.
   * Non-enrolled users receive only public info (no outline/lessons).
   */
  @Get(":id/content")
  getContent(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.courses.getContent(id, user.sub);
  }

  /** Check enrollment status for the current user. */
  @Get(":id/enrollment")
  checkEnrollment(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.courses.checkEnrollment(user.sub, id);
  }

  /**
   * Submit enrollment REQUEST (does not auto-enroll).
   * Blocked when course.allowEnrollmentRequests is false.
   */
  @Post(":id/enroll")
  enroll(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body?: { note?: string }
  ) {
    return this.courses.enroll(user.sub, id, body?.note);
  }

  @Post(":id/enrollment-requests")
  requestEnrollment(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body?: { note?: string }
  ) {
    return this.courses.requestEnrollment(user.sub, id, body?.note);
  }

  @Post("enrollment-requests/:requestId/approve")
  @Roles("SUPER_ADMIN", "STAFF")
  approveRequest(
    @Param("requestId") requestId: string,
    @CurrentUser() user: AuthUser,
    @Body() body?: { adminNote?: string }
  ) {
    return this.courses.reviewEnrollmentRequest(
      requestId,
      user.sub,
      "APPROVE",
      body?.adminNote
    );
  }

  @Post("enrollment-requests/:requestId/reject")
  @Roles("SUPER_ADMIN", "STAFF")
  rejectRequest(
    @Param("requestId") requestId: string,
    @CurrentUser() user: AuthUser,
    @Body() body?: { adminNote?: string }
  ) {
    return this.courses.reviewEnrollmentRequest(
      requestId,
      user.sub,
      "REJECT",
      body?.adminNote
    );
  }

  @Post("topics/:topicId/progress")
  toggleTopic(
    @Param("topicId") topicId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { completed?: boolean }
  ) {
    return this.courses.toggleTopic(user.sub, topicId, body.completed !== false);
  }

  @Post()
  @Roles("SUPER_ADMIN", "STAFF")
  create(@Body() body: Record<string, unknown>) {
    return this.courses.create(body as never);
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "STAFF")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.courses.update(id, body as never);
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "STAFF")
  remove(@Param("id") id: string) {
    return this.courses.remove(id);
  }
}
