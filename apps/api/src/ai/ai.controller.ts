import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  AuthUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { AiService } from "./ai.service";

@Controller("ai")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get("status")
  status() {
    return this.ai.status();
  }

  @Get("history")
  history(@CurrentUser() user: AuthUser) {
    return this.ai.history(user.sub);
  }

  @Delete("history")
  clearHistory(@CurrentUser() user: AuthUser) {
    return this.ai.clearHistory(user.sub);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("chat")
  chat(
    @CurrentUser() user: AuthUser,
    @Body() body: { message?: string; courseId?: string }
  ) {
    return this.ai.chat(user.sub, {
      message: body.message ?? "",
      courseId: body.courseId,
    });
  }

  @Get("usage")
  @Roles("SUPER_ADMIN", "STAFF")
  usage() {
    return this.ai.usageSummary();
  }
}
