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
import { QuizStatus } from "@prisma/client";
import {
  AuthUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { QuizzesService } from "./quizzes.service";

@Controller("quizzes")
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuizzesController {
  constructor(private readonly quizzes: QuizzesService) {}

  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.quizzes.listForStudent(user.sub);
  }

  @Get()
  @Roles("SUPER_ADMIN", "STAFF")
  list(@Query("courseId") courseId?: string) {
    return this.quizzes.listForAdmin(courseId);
  }

  @Post()
  @Roles("SUPER_ADMIN", "STAFF")
  create(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.quizzes.create(user.sub, body as never);
  }

  @Get(":id/take")
  take(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.quizzes.getForTake(id, user.sub);
  }

  @Post(":id/attempts")
  start(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.quizzes.startAttempt(id, user.sub);
  }

  @Post("attempts/:attemptId/submit")
  submit(
    @Param("attemptId") attemptId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { answers?: Record<string, number> }
  ) {
    return this.quizzes.submitAttempt(
      attemptId,
      user.sub,
      body.answers ?? {}
    );
  }

  @Get(":id")
  @Roles("SUPER_ADMIN", "STAFF")
  get(@Param("id") id: string) {
    return this.quizzes.getAdmin(id);
  }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "STAFF")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.quizzes.update(id, {
      title: body.title as string | undefined,
      description: body.description as string | null | undefined,
      passPercent: body.passPercent as number | undefined,
      timeLimitMinutes: body.timeLimitMinutes as number | null | undefined,
      shuffleQuestions: body.shuffleQuestions as boolean | undefined,
      maxAttempts: body.maxAttempts as number | undefined,
      issueCertificate: body.issueCertificate as boolean | undefined,
      status: body.status as QuizStatus | undefined,
      questions: body.questions as never,
    });
  }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "STAFF")
  remove(@Param("id") id: string) {
    return this.quizzes.delete(id);
  }
}
