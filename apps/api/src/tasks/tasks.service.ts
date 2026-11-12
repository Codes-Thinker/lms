import { Injectable, NotFoundException } from "@nestjs/common";
import { AccountType, TaskStatus } from "@prisma/client";
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
  }) {
    const t = await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        studyNotes: data.studyNotes,
        audience: data.audience ?? AccountType.STAFF,
        assigneeId: data.assigneeId,
        createdById: data.createdById,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        timerMinutes: data.timerMinutes ?? 0,
        status: TaskStatus.ASSIGNED,
      },
    });
    if (data.assigneeId) {
      await this.notifications.notifyUser({
        userId: data.assigneeId,
        title: "New task",
        body: data.title,
        type: "TASK",
        data: { taskId: t.id },
      });
    }
    return (await this.listTasks()).find((x) => x.id === t.id);
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
