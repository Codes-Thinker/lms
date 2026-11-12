import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("overview")
  @Roles("SUPER_ADMIN", "STAFF")
  overview() {
    return this.reports.overview();
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.reports.forUser(user.sub);
  }

  @Get("users/:id")
  @Roles("SUPER_ADMIN", "STAFF")
  forUser(@Param("id") id: string) {
    return this.reports.forUser(id);
  }
}
