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
      courseId: body.courseId as string | undefined,
    });
  }

  /** Teacher: assign to whole course/batch or selected students. */
  @Post("tasks/assign")
  @Roles("SUPER_ADMIN", "STAFF")
  assignMany(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      title: string;
      description?: string;
      studyNotes?: string;
      courseId: string;
      assigneeIds?: string[];
      dueAt?: string;
      timerMinutes?: number;
    }
  ) {
    return this.tasks.assignToStudents(user.sub, user.accountType, body);
  }

  /** Teacher: tasks I assigned (track completion). */
  @Get("tasks/assigned-by-me")
  @Roles("SUPER_ADMIN", "STAFF")
  assignedByMe(@CurrentUser() user: AuthUser) {
    return this.tasks.listAssignedBy(user.sub, user.accountType);
  }

  /** Get tasks for a specific student (admin view). */
  @Get("tasks/student/:userId")
  @Roles("SUPER_ADMIN", "STAFF")
  studentTasks(@Param("userId") userId: string) {
    return this.tasks.tasksForStudent(userId);
  }

  /** Student submits an assignment. */
  @Post("tasks/:id/submit")
  submitAssignment(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { submissionText?: string; submissionFileData?: string; submissionFileName?: string },
  ) {
    return this.tasks.submitAssignment(id, user.sub, body);
  }

  /** Teacher/admin reviews a submission. */
  @Patch("tasks/:id/review")
  @Roles("SUPER_ADMIN", "STAFF")
  reviewAssignment(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { reviewStatus: string; feedback?: string },
  ) {
    return this.tasks.reviewAssignment(id, user.sub, body);
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
