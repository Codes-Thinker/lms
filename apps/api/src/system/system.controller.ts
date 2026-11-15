import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuthUser } from "../common/decorators/current-user.decorator";
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

  // ── Office geofence configuration ──
  @Get("office-config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  getOfficeConfig() {
    return this.system.getOfficeConfig();
  }

  @Put("office-config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "STAFF")
  updateOfficeConfig(@Body() body: Record<string, unknown>) {
    return this.system.updateOfficeConfig(body as never);
  }

  // ── Course categories (dynamic) ──
  @Get("categories")
  @UseGuards(JwtAuthGuard, RolesGuard)
  listCategories() {
    return this.system.listCategories();
  }

  @Get("categories/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "STAFF")
  listAllCategories() {
    return this.system.listAllCategories();
  }

  @Post("categories")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "STAFF")
  createCategory(@Body() body: Record<string, unknown>) {
    return this.system.createCategory(body as never);
  }

  @Patch("categories/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "STAFF")
  updateCategory(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.system.updateCategory(id, body as never);
  }

  @Delete("categories/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "STAFF")
  deleteCategory(@Param("id") id: string) {
    return this.system.deleteCategory(id);
  }

  // ── Staff work schedules ──
  @Get("schedule/me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  getMySchedule(@CurrentUser() user: AuthUser) {
    return this.system.getSchedule(user.sub);
  }

  @Get("schedule/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "STAFF")
  getUserSchedule(@Param("userId") userId: string) {
    return this.system.getSchedule(userId);
  }

  @Get("schedules")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "STAFF")
  listSchedules() {
    return this.system.listSchedules();
  }

  @Put("schedule/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "STAFF")
  upsertSchedule(@Param("userId") userId: string, @Body() body: Record<string, unknown>) {
    return this.system.upsertSchedule(userId, body as never);
  }

  @Delete("schedule/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  deleteSchedule(@Param("id") id: string) {
    return this.system.deleteSchedule(id);
  }
}
