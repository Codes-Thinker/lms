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
  list(@Query("courseId") courseId?: string, @Query("studentId") studentId?: string) {
    return this.fees.list(studentId, courseId);
  }

  /** Trigger / inspect monthly fee reminder cron (admin). */
  @Post("run-reminders")
  @Roles("SUPER_ADMIN", "STAFF")
  runReminders() {
    return this.fees.runScheduledFeeReminders();
  }

  @Post("ensure-monthly")
  @Roles("SUPER_ADMIN", "STAFF")
  ensureMonthly() {
    return this.fees.ensureMonthlyFeeCases();
  }

  /** Admin: list pending payment submissions. */
  @Get("submissions")
  @Roles("SUPER_ADMIN", "STAFF")
  submissions(@Query("status") status?: string) {
    return this.fees.listSubmissions(status);
  }

  /** Admin: configure monthly fee for a student. */
  @Post("configure")
  @Roles("SUPER_ADMIN", "STAFF")
  configure(@Body() body: {
    studentId: string;
    monthlyFee?: number;
    feeStartDate?: string;
    feeDueDay?: number;
    courseId?: string;
    paymentType?: "MONTHLY" | "TWO_INSTALLMENTS" | "CUSTOM";
    installment1Amount?: number;
    installment2Amount?: number;
    courseDurationMonths?: number;
    totalCourseFee?: number;
  }) {
    return this.fees.configureStudentFee(body.studentId, body);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.fees.get(id);
  }

  /** Get payment submissions for a fee case. */
  @Get(":id/submissions")
  feeSubmissions(@Param("id") id: string) {
    return this.fees.submissionsForFee(id);
  }

  @Patch(":id/status")
  @Roles("SUPER_ADMIN", "STAFF")
  status(@Param("id") id: string, @Body() body: { status: FeeStatus }) {
    return this.fees.updateStatus(id, body.status);
  }

  /** Student: submit payment with screenshot proof. */
  @Post(":id/submit-payment")
  submitPayment(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { amount: number; screenshotData?: string; screenshotName?: string },
  ) {
    return this.fees.submitPayment(id, user.sub, body);
  }

  /** Admin: verify or reject a payment. */
  @Patch(":id/verify")
  @Roles("SUPER_ADMIN", "STAFF")
  verifyPayment(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { approved: boolean; rejectionReason?: string },
  ) {
    return this.fees.verifyPayment(id, user.sub, body);
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
