import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  AuthUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CertificatesService } from "./certificates.service";

@Controller("certificates")
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  /** Public verification (no auth). */
  @Get("verify/:code")
  verify(@Param("code") code: string) {
    return this.certificates.verify(code);
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard, RolesGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.certificates.listMine(user.sub);
  }

  @Get("mine/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  mineOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.certificates.getMine(id, user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "STAFF")
  list(
    @Query("courseId") courseId?: string,
    @Query("userId") userId?: string
  ) {
    return this.certificates.listAll({ courseId, userId });
  }

  @Post("issue")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "STAFF")
  issue(
    @Body()
    body: { userId: string; courseId: string; title?: string }
  ) {
    return this.certificates.issueForCourse({
      userId: body.userId,
      courseId: body.courseId,
      title: body.title,
    });
  }
}
