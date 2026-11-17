import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AttendanceService } from "../attendance/attendance.service";
import { FeesService } from "../fees/fees.service";

/**
 * External cron hooks for Render Cron Jobs / GitHub Actions.
 * Protect with header: Authorization: Bearer <CRON_SECRET>
 */
@Controller("ops")
export class OpsController {
  constructor(
    private readonly config: ConfigService,
    private readonly fees: FeesService,
    private readonly attendance: AttendanceService
  ) {}

  private assertCron(auth?: string) {
    const secret = this.config.get<string>("CRON_SECRET")?.trim();
    if (!secret) {
      throw new UnauthorizedException("CRON_SECRET is not configured");
    }
    const token = auth?.startsWith("Bearer ")
      ? auth.slice(7).trim()
      : auth?.trim();
    if (!token || token !== secret) {
      throw new UnauthorizedException("Invalid cron secret");
    }
  }

  @Post("cron/fee-reminders")
  async feeReminders(@Headers("authorization") auth?: string) {
    this.assertCron(auth);
    return this.fees.runScheduledFeeReminders();
  }

  @Post("cron/auto-checkout")
  async autoCheckout(@Headers("authorization") auth?: string) {
    this.assertCron(auth);
    await this.attendance.runAutoCheckout();
    return { ok: true };
  }
}
