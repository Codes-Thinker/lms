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
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from "./users.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles("SUPER_ADMIN", "STAFF")
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  /** Self hard-delete — any signed-in app user. */
  @Delete("me")
  @Roles("SUPER_ADMIN", "STAFF", "STUDENT", "INTERN")
  deleteMe(@CurrentUser() actor: AuthUser) {
    return this.users.purgeUser(actor.sub, {
      actorId: actor.sub,
      selfRequested: true,
    });
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "STAFF")
  get(@Param("id") id: string) {
    return this.users.getById(id);
  }

  /** Comprehensive student detail for admin dashboard. */
  @Get(":id/detail")
  @Roles("SUPER_ADMIN", "STAFF")
  detail(@Param("id") id: string) {
    return this.users.getStudentDetail(id);
  }

  @Post()
  @Roles("SUPER_ADMIN", "STAFF")
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.create(dto, actor.sub);
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "STAFF")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Post(":id/resend-invitation")
  @Roles("SUPER_ADMIN", "STAFF")
  resend(@Param("id") id: string, @CurrentUser() actor: AuthUser) {
    return this.users.resendInvitation(id, actor.sub);
  }

  /** Admin hard-delete — wipes all of that user's data. */
  @Delete(":id")
  @Roles("SUPER_ADMIN")
  remove(@Param("id") id: string, @CurrentUser() actor: AuthUser) {
    return this.users.purgeUser(id, {
      actorId: actor.sub,
      selfRequested: false,
    });
  }
}
