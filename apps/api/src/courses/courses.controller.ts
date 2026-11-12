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
    const publishedOnly = all !== "1" || !["SUPER_ADMIN", "STAFF"].includes(user.accountType);
    return this.courses.list(user.sub, publishedOnly);
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.courses.get(id, user.sub);
  }

  @Post(":id/enroll")
  enroll(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.courses.enroll(user.sub, id);
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
}
