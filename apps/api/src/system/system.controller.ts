import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { SystemService } from "./system.service";

@Controller("system")
export class SystemController {
  constructor(private readonly system: SystemService) {}

  @Get("app-version")
  getVersion() {
    return this.system.getVersion();
  }

  @Put("app-version")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  updateVersion(@Body() body: Record<string, unknown>) {
    return this.system.updateVersion(body as never);
  }

  @Get("payment-info")
  @UseGuards(JwtAuthGuard, RolesGuard)
  paymentInfo() {
    return this.system.paymentInfo();
  }

  @Put("payment-info")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  updatePayment(@Body() body: Record<string, unknown>) {
    return this.system.updatePaymentInfo(body as never);
  }
}
