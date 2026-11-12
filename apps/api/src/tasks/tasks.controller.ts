import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AccountType, TaskStatus } from "@prisma/client";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TasksService } from "./tasks.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get("tasks/me")
  myTasks(@CurrentUser() user: AuthUser) {
    return this.tasks.listTasks({ assigneeId: user.sub });
  }

  @Get("tasks")
  @Roles("SUPER_ADMIN", "STAFF")
  allTasks() {
    return this.tasks.listTasks();
  }

  @Post("tasks")
  @Roles("SUPER_ADMIN", "STAFF")
  createTask(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.tasks.createTask({
      title: String(body.title ?? ""),
      description: body.description as string | undefined,
      studyNotes: body.studyNotes as string | undefined,
      audience: body.audience as AccountType | undefined,
      assigneeId: body.assigneeId as string | undefined,
      createdById: user.sub,
      dueAt: body.dueAt as string | undefined,
      timerMinutes: body.timerMinutes as number | undefined,
    });
  }

  @Patch("tasks/:id")
  updateTask(
    @Param("id") id: string,
    @Body() body: { status?: TaskStatus; spentMinutes?: number }
  ) {
    return this.tasks.updateTask(id, body);
  }

  @Get("projects/me")
  myProjects(@CurrentUser() user: AuthUser) {
    return this.tasks.listProjects(user.sub);
  }

  @Get("projects")
  @Roles("SUPER_ADMIN", "STAFF")
  allProjects() {
    return this.tasks.listProjects();
  }

  @Post("projects")
  @Roles("SUPER_ADMIN", "STAFF")
  createProject(
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>
  ) {
    return this.tasks.createProject({
      title: String(body.title ?? ""),
      description: body.description as string | undefined,
      internId: String(body.internId ?? ""),
      createdById: user.sub,
      deadline: body.deadline as string | undefined,
      techStack: body.techStack as string | undefined,
      repoUrl: body.repoUrl as string | undefined,
    });
  }

  @Patch("projects/:id")
  updateProject(
    @Param("id") id: string,
    @Body() body: { status?: TaskStatus; progressPercent?: number }
  ) {
    return this.tasks.updateProject(id, body);
  }
}
