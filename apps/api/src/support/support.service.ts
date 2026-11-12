import { Injectable, NotFoundException } from "@nestjs/common";
import { ChatKind, NotificationType, TicketKind, TicketStatus } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async listTickets(userId?: string) {
    const rows = await this.prisma.supportTicket.findMany({
      where: userId ? { userId } : undefined,
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((t) => ({
      id: t.id,
      kind: t.kind,
      userId: t.userId,
      userName: t.user.fullName,
      userRole: t.user.accountType,
      title: t.title,
      body: t.body,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async createTicket(
    userId: string,
    data: { kind: TicketKind; title: string; body: string }
  ) {
    const t = await this.prisma.supportTicket.create({
      data: {
        userId,
        kind: data.kind,
        title: data.title,
        body: data.body,
      },
      include: { user: true },
    });
    const kindLabel = t.kind === TicketKind.COMPLAIN ? "Complain" : "Report";
    await this.notifications.notifyAdmins({
      title: `${kindLabel} · ${t.user.fullName}`,
      body: t.title,
      type: NotificationType.GENERAL,
      data: {
        ticketId: t.id,
        kind: t.kind,
        fromUserId: t.userId,
      },
    });
    return {
      id: t.id,
      kind: t.kind,
      userId: t.userId,
      userName: t.user.fullName,
      userRole: t.user.accountType,
      title: t.title,
      body: t.body,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    };
  }

  async updateTicketStatus(id: string, status: TicketStatus) {
    const t = await this.prisma.supportTicket.update({
      where: { id },
      data: { status },
      include: { user: true },
    });
    await this.notifications.notifyUser({
      userId: t.userId,
      title: `${t.kind === TicketKind.COMPLAIN ? "Complain" : "Report"} updated`,
      body: `${t.title} → ${status}`,
      type: NotificationType.GENERAL,
      data: { ticketId: t.id, status },
    });
    return {
      id: t.id,
      kind: t.kind,
      userId: t.userId,
      userName: t.user.fullName,
      userRole: t.user.accountType,
      title: t.title,
      body: t.body,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    };
  }

  async activeSurvey() {
    const s = await this.prisma.survey.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
    if (!s) return null;
    return {
      id: s.id,
      title: s.title,
      questions: s.questions,
    };
  }

  async submitSurvey(
    userId: string,
    surveyId: string,
    answers: Record<string, string>
  ) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    await this.prisma.surveyResponse.upsert({
      where: { surveyId_userId: { surveyId, userId } },
      update: { answers },
      create: { surveyId, userId, answers },
    });
    await this.notifications.notifyAdmins({
      title: `Survey · ${user?.fullName ?? "Student"}`,
      body: survey?.title ?? "Survey submitted",
      type: NotificationType.GENERAL,
      data: {
        surveyId,
        kind: "SURVEY",
        fromUserId: userId,
      },
    });
    return { ok: true };
  }

  async activitySummary() {
    const [openTickets, reports, complains, surveys, feesSent, chat] =
      await Promise.all([
        this.prisma.supportTicket.count({
          where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
        }),
        this.prisma.supportTicket.count({
          where: {
            kind: TicketKind.REPORT,
            status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
          },
        }),
        this.prisma.supportTicket.count({
          where: {
            kind: TicketKind.COMPLAIN,
            status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
          },
        }),
        this.prisma.surveyResponse.count(),
        this.prisma.feeCase.count({ where: { status: "SENT" } }),
        this.unreadSummary(),
      ]);
    const recentTickets = await this.prisma.supportTicket.findMany({
      where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    const recentSurveys = await this.prisma.surveyResponse.findMany({
      include: { user: true, survey: true },
      orderBy: { submittedAt: "desc" },
      take: 4,
    });
    return {
      openTickets,
      reports,
      complains,
      surveys,
      feesAwaitingReview: feesSent,
      chatUnread: chat.unreadMessages,
      chatUnreadThreads: chat.unreadThreads,
      recentTickets: recentTickets.map((t) => ({
        id: t.id,
        kind: t.kind,
        title: t.title,
        userName: t.user.fullName,
        userId: t.userId,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      recentSurveys: recentSurveys.map((r) => ({
        id: r.id,
        userName: r.user.fullName,
        userId: r.userId,
        surveyTitle: r.survey.title,
        submittedAt: r.submittedAt.toISOString(),
      })),
    };
  }

  async listSurveyResponses() {
    const rows = await this.prisma.surveyResponse.findMany({
      include: { user: true, survey: true },
      orderBy: { submittedAt: "desc" },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      surveyId: r.surveyId,
      surveyTitle: r.survey.title,
      userId: r.userId,
      userName: r.user.fullName,
      answers: r.answers,
      submittedAt: r.submittedAt.toISOString(),
    }));
  }

  async listChats(kind?: ChatKind) {
    const rows = await this.prisma.chatThread.findMany({
      where: kind ? { kind } : undefined,
      include: {
        user: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((t) => this.mapThread(t));
  }

  /** Total unread for admin sidebar badge. */
  async unreadSummary() {
    const agg = await this.prisma.chatThread.aggregate({
      _sum: { unreadByAdmin: true },
      _count: { _all: true },
    });
    const threads = await this.prisma.chatThread.count({
      where: { unreadByAdmin: { gt: 0 } },
    });
    return {
      unreadMessages: agg._sum.unreadByAdmin ?? 0,
      unreadThreads: threads,
      totalThreads: agg._count._all,
    };
  }

  async myChat(userId: string, kind: ChatKind = ChatKind.ADMIN) {
    let thread = await this.prisma.chatThread.findFirst({
      where: { userId, kind },
      include: {
        user: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!thread) {
      thread = await this.prisma.chatThread.create({
        data: { userId, kind },
        include: {
          user: true,
          messages: { orderBy: { createdAt: "asc" } },
        },
      });
    }
    // Opening own thread clears user unread.
    if (thread.unreadByUser > 0) {
      thread = await this.prisma.chatThread.update({
        where: { id: thread.id },
        data: { unreadByUser: 0 },
        include: {
          user: true,
          messages: { orderBy: { createdAt: "asc" } },
        },
      });
    }
    return this.mapThread(thread);
  }

  async markReadByAdmin(threadId: string) {
    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { unreadByAdmin: 0 },
    });
    return this.getThread(threadId);
  }

  async getThread(threadId: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        user: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!thread) throw new NotFoundException("Thread not found");
    return this.mapThread(thread);
  }

  async postMessage(
    threadId: string,
    input: {
      senderId?: string;
      senderName: string;
      senderRole: string;
      text: string;
    }
  ) {
    const text = input.text.trim();
    if (!text) throw new NotFoundException("Message required");

    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { user: true },
    });
    if (!thread) throw new NotFoundException("Thread not found");

    await this.prisma.chatMessage.create({
      data: {
        threadId,
        senderId: input.senderId,
        senderName: input.senderName,
        senderRole: input.senderRole,
        text,
      },
    });

    const isAdmin = input.senderRole === "ADMIN";
    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: {
        lastMessage: text,
        unreadByAdmin: isAdmin ? 0 : { increment: 1 },
        unreadByUser: isAdmin ? { increment: 1 } : 0,
      },
    });

    // Push + in-app notification
    const preview = text.length > 80 ? `${text.slice(0, 77)}…` : text;
    if (isAdmin) {
      await this.notifications.notifyUser({
        userId: thread.userId,
        title: "Code's Thinker",
        body: preview,
        type: NotificationType.CHAT,
        data: { threadId, kind: "CHAT" },
      });
    } else {
      await this.notifications.notifyAdmins({
        title: `Chat · ${thread.user.fullName}`,
        body: preview,
        type: NotificationType.CHAT,
        data: {
          threadId,
          kind: "CHAT",
          fromUserId: thread.userId,
          fromRole: thread.user.accountType,
        },
      });
    }

    return this.getThread(threadId);
  }

  private mapThread(t: {
    id: string;
    userId: string;
    kind: ChatKind;
    lastMessage: string | null;
    unreadByAdmin: number;
    unreadByUser?: number;
    updatedAt: Date;
    user: { fullName: string; accountType: string };
    messages: {
      id: string;
      senderId: string | null;
      senderName: string;
      senderRole: string;
      text: string;
      createdAt: Date;
    }[];
  }) {
    return {
      id: t.id,
      kind: t.kind,
      userId: t.userId,
      userName: t.user.fullName,
      userRole: t.user.accountType,
      lastMessage: t.lastMessage,
      updatedAt: t.updatedAt.toISOString(),
      unreadByAdmin: t.unreadByAdmin,
      unreadByUser: t.unreadByUser ?? 0,
      messages: t.messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        senderRole: m.senderRole,
        text: m.text,
        sentAt: m.createdAt.toISOString(),
      })),
    };
  }
}
