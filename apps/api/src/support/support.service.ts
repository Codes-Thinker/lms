import { Injectable, NotFoundException } from "@nestjs/common";
import { ChatKind, TicketKind, TicketStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

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
        status: TicketStatus.OPEN,
      },
      include: { user: true },
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
    return this.prisma.supportTicket.update({ where: { id }, data: { status } });
  }

  async activeSurvey() {
    return this.prisma.survey.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async submitSurvey(
    userId: string,
    surveyId: string,
    answers: Record<string, string>
  ) {
    return this.prisma.surveyResponse.upsert({
      where: { surveyId_userId: { surveyId, userId } },
      update: { answers },
      create: { surveyId, userId, answers },
    });
  }

  async listSurveyResponses() {
    const rows = await this.prisma.surveyResponse.findMany({
      include: { user: true, survey: true },
      orderBy: { submittedAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      surveyId: r.surveyId,
      surveyTitle: r.survey.title,
      userId: r.userId,
      userName: r.user.fullName,
      userRole: r.user.accountType,
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
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException("Thread not found");

    await this.prisma.chatMessage.create({
      data: {
        threadId,
        senderId: input.senderId,
        senderName: input.senderName,
        senderRole: input.senderRole,
        text: input.text,
      },
    });

    const isAdmin = input.senderRole === "ADMIN";
    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: {
        lastMessage: input.text,
        unreadByAdmin: isAdmin ? 0 : { increment: 1 },
        unreadByUser: isAdmin ? { increment: 1 } : 0,
      },
    });

    const updated = await this.prisma.chatThread.findUniqueOrThrow({
      where: { id: threadId },
      include: {
        user: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    return this.mapThread(updated);
  }

  private mapThread(t: {
    id: string;
    userId: string;
    kind: ChatKind;
    lastMessage: string | null;
    unreadByAdmin: number;
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
