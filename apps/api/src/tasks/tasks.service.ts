import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountType, NotificationType, TaskStatus } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async listTasks(filters?: { assigneeId?: string; audience?: AccountType }) {
    const rows = await this.prisma.task.findMany({
      where: {
        assigneeId: filters?.assigneeId,
        audience: filters?.audience,
      },
      include: {
        assignee: true,
        createdBy: true,
        course: { select: { id: true, title: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      studyNotes: t.studyNotes,
      assignedToId: t.assigneeId,
      assignedToName: t.assignee?.fullName ?? null,
      assignedBy: t.createdBy?.fullName ?? null,
      audience: t.audience,
      status: t.status,
      dueAt: t.dueAt?.toISOString() ?? null,
      timerMinutes: t.timerMinutes,
      spentMinutes: t.spentMinutes,
      courseId: t.courseId,
      courseTitle: t.course?.title ?? null,
      submissionText: t.submissionText,
      submissionFileName: t.submissionFileName,
      submittedAt: t.submittedAt?.toISOString() ?? null,
      reviewerId: t.reviewerId,
      reviewedAt: t.reviewedAt?.toISOString() ?? null,
      feedback: t.feedback,
      reviewStatus: t.reviewStatus,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      chat: t.messages.map((m) => ({
        id: m.id,
        senderName: m.senderName,
        senderRole: m.senderRole,
        text: m.text,
        sentAt: m.createdAt.toISOString(),
      })),
    }));
  }

  async createTask(data: {
    title: string;
    description?: string;
    studyNotes?: string;
    audience?: AccountType;
    assigneeId?: string;
    createdById?: string;
    dueAt?: string;
    timerMinutes?: number;
    courseId?: string;
  }) {
    const t = await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        studyNotes: data.studyNotes,
        audience: data.audience ?? AccountType.STUDENT,
        assigneeId: data.assigneeId,
        createdById: data.createdById,
        courseId: data.courseId,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        timerMinutes: data.timerMinutes ?? 0,
        status: TaskStatus.ASSIGNED,
      },
    });
    if (data.assigneeId) {
      await this.notifications.notifyUser({
        userId: data.assigneeId,
        title: "New assignment",
        body: data.title,
        type: NotificationType.TASK,
        data: { taskId: t.id },
      });
    }
    return (await this.listTasks()).find((x) => x.id === t.id);
  }

  /**
   * Assign the same task to many students (whole course/batch or selected IDs).
   * Teachers may only target students enrolled in courses they instruct.
   */
  async assignToStudents(
    teacherId: string,
    accountType: string,
    data: {
      title: string;
      description?: string;
      studyNotes?: string;
      courseId: string;
      assigneeIds?: string[];
      dueAt?: string;
      timerMinutes?: number;
    },
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: data.courseId },
      select: { id: true, title: true, instructorId: true },
    });
    if (!course) throw new NotFoundException("Course not found");
    if (
      accountType !== "SUPER_ADMIN" &&
      course.instructorId &&
      course.instructorId !== teacherId
    ) {
      throw new ForbiddenException("You can only assign for your courses");
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId: data.courseId },
      select: { userId: true },
    });
    const enrolledIds = new Set(enrollments.map((e) => e.userId));
    let targets =
      data.assigneeIds && data.assigneeIds.length > 0
        ? data.assigneeIds.filter((id) => enrolledIds.has(id))
        : [...enrolledIds];

    if (targets.length === 0) {
      throw new NotFoundException("No students to assign");
    }

    const created = [];
    for (const assigneeId of targets) {
      const row = await this.createTask({
        title: data.title,
        description: data.description,
        studyNotes: data.studyNotes,
        audience: AccountType.STUDENT,
        assigneeId,
        createdById: teacherId,
        courseId: data.courseId,
        dueAt: data.dueAt,
        timerMinutes: data.timerMinutes,
      });
      if (row) created.push(row);
    }
    return { courseId: data.courseId, assigned: created.length, tasks: created };
  }

  /** Tasks created by this teacher (to track student completion). */
  async listAssignedBy(teacherId: string, accountType: string) {
    if (accountType === "SUPER_ADMIN") {
      return this.listTasks({ audience: AccountType.STUDENT });
    }
    const rows = await this.prisma.task.findMany({
      where: { createdById: teacherId },
      include: {
        assignee: true,
        createdBy: true,
        course: { select: { id: true, title: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      studyNotes: t.studyNotes,
      assignedToId: t.assigneeId,
      assignedToName: t.assignee?.fullName ?? null,
      assignedBy: t.createdBy?.fullName ?? null,
      audience: t.audience,
      status: t.status,
      dueAt: t.dueAt?.toISOString() ?? null,
      timerMinutes: t.timerMinutes,
      spentMinutes: t.spentMinutes,
      courseId: t.courseId,
      courseTitle: t.course?.title ?? null,
      submissionText: t.submissionText,
      submissionFileName: t.submissionFileName,
      submittedAt: t.submittedAt?.toISOString() ?? null,
      reviewerId: t.reviewerId,
      reviewedAt: t.reviewedAt?.toISOString() ?? null,
      feedback: t.feedback,
      reviewStatus: t.reviewStatus,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      chat: t.messages.map((m) => ({
        id: m.id,
        senderName: m.senderName,
        senderRole: m.senderRole,
        text: m.text,
        sentAt: m.createdAt.toISOString(),
      })),
    }));
  }

  /** Student submits an assignment (text response + optional file). */
  async submitAssignment(
    taskId: string,
    userId: string,
    data: { submissionText?: string; submissionFileData?: string; submissionFileName?: string },
  ) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException("Assignment not found");
    if (task.assigneeId !== userId) {
      throw new ForbiddenException("This assignment is not assigned to you");
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        submissionText: data.submissionText ?? null,
        submissionFileData: data.submissionFileData ?? null,
        submissionFileName: data.submissionFileName ?? null,
        submittedAt: new Date(),
        status: TaskStatus.SUBMITTED,
      },
    });

    // Notify the creator (teacher/admin)
    if (task.createdById) {
      await this.notifications.notifyUser({
        userId: task.createdById,
        title: "Assignment submitted",
        body: `${task.title} has been submitted`,
        type: NotificationType.TASK,
        data: { taskId, event: "submitted" },
      });
    }

    return (await this.listTasks()).find((x) => x.id === taskId);
  }

  /** Teacher/admin reviews a submission — approve, reject, or request revision. */
  async reviewAssignment(
    taskId: string,
    reviewerId: string,
    data: { reviewStatus: string; feedback?: string },
  ) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException("Assignment not found");

    const statusMap: Record<string, TaskStatus> = {
      APPROVED: TaskStatus.DONE,
      REJECTED: TaskStatus.ASSIGNED,
      REVISION_REQUESTED: TaskStatus.ASSIGNED,
      REVIEWED: TaskStatus.REVIEWED,
    };
    const newStatus = statusMap[data.reviewStatus] ?? TaskStatus.REVIEWED;

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        reviewStatus: data.reviewStatus,
        feedback: data.feedback ?? null,
        reviewedAt: new Date(),
        reviewerId,
        status: newStatus,
      },
    });

    // Notify the student
    if (task.assigneeId) {
      const titleMap: Record<string, string> = {
        APPROVED: "Assignment approved",
        REJECTED: "Assignment rejected",
        REVISION_REQUESTED: "Revision requested",
        REVIEWED: "Assignment reviewed",
      };
      await this.notifications.notifyUser({
        userId: task.assigneeId,
        title: titleMap[data.reviewStatus] ?? "Assignment reviewed",
        body: data.feedback
          ? `${task.title}: ${data.feedback}`
          : task.title,
        type: NotificationType.TASK,
        data: { taskId, event: "reviewed", reviewStatus: data.reviewStatus },
      });
    }

    return (await this.listTasks()).find((x) => x.id === taskId);
  }

  /** Get tasks for a specific student (admin view). */
  async tasksForStudent(studentId: string) {
    return this.listTasks({ assigneeId: studentId });
  }

  async updateTask(
    id: string,
    data: Partial<{
      status: TaskStatus;
      spentMinutes: number;
      title: string;
      description: string;
    }>
  ) {
    await this.prisma.task.update({ where: { id }, data });
    const list = await this.listTasks();
    const row = list.find((x) => x.id === id);
    if (!row) throw new NotFoundException("Task not found");
    return row;
  }

  async listProjects(internId?: string) {
    const rows = await this.prisma.project.findMany({
      where: internId ? { internId } : undefined,
      include: { intern: true, createdBy: true },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      internId: p.internId,
      internName: p.intern.fullName,
      assignedBy: p.createdBy?.fullName ?? null,
      status: p.status,
      deadline: p.deadline?.toISOString().slice(0, 10) ?? null,
      techStack: p.techStack,
      repoUrl: p.repoUrl,
      progressPercent: p.progressPercent,
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async createProject(data: {
    title: string;
    description?: string;
    internId: string;
    createdById?: string;
    deadline?: string;
    techStack?: string;
    repoUrl?: string;
  }) {
    await this.prisma.project.create({
      data: {
        title: data.title,
        description: data.description,
        internId: data.internId,
        createdById: data.createdById,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        techStack: data.techStack,
        repoUrl: data.repoUrl,
        status: TaskStatus.ASSIGNED,
      },
    });
    return this.listProjects(data.internId);
  }

  async updateProject(
    id: string,
    data: Partial<{
      status: TaskStatus;
      progressPercent: number;
      title: string;
      description: string;
    }>
  ) {
    await this.prisma.project.update({ where: { id }, data });
    const list = await this.listProjects();
    const row = list.find((x) => x.id === id);
    if (!row) throw new NotFoundException("Project not found");
    return row;
  }
}
