import { Injectable, NotFoundException } from "@nestjs/common";
import { FeeStatus } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  private map(f: {
    id: string;
    studentId: string;
    courseTitle: string;
    month: string;
    amount: number;
    status: FeeStatus;
    dueDate: Date;
    student: { fullName: string };
    messages: {
      id: string;
      senderName: string;
      senderRole: string;
      text: string;
      hasScreenshot: boolean;
      createdAt: Date;
    }[];
  }) {
    return {
      id: f.id,
      studentId: f.studentId,
      studentName: f.student.fullName,
      courseTitle: f.courseTitle,
      month: f.month,
      amount: f.amount,
      status: f.status,
      dueDate: f.dueDate.toISOString().slice(0, 10),
      chat: f.messages.map((m) => ({
        id: m.id,
        senderName: m.senderName,
        senderRole: m.senderRole,
        text: m.text,
        hasScreenshot: m.hasScreenshot,
        sentAt: m.createdAt.toISOString(),
      })),
    };
  }

  async list(studentId?: string) {
    const rows = await this.prisma.feeCase.findMany({
      where: studentId ? { studentId } : undefined,
      include: {
        student: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { dueDate: "desc" },
    });
    return rows.map((r) => this.map(r));
  }

  async get(id: string) {
    const row = await this.prisma.feeCase.findUnique({
      where: { id },
      include: {
        student: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!row) throw new NotFoundException("Fee case not found");
    return this.map(row);
  }

  async addMessage(
    id: string,
    input: {
      senderId?: string;
      senderName: string;
      senderRole: string;
      text: string;
      hasScreenshot?: boolean;
    }
  ) {
    await this.prisma.feeMessage.create({
      data: {
        feeCaseId: id,
        senderId: input.senderId,
        senderName: input.senderName,
        senderRole: input.senderRole,
        text: input.text,
        hasScreenshot: input.hasScreenshot ?? false,
      },
    });
    if (input.senderRole !== "ADMIN") {
      await this.prisma.feeCase.update({
        where: { id },
        data: { status: FeeStatus.SENT },
      });
    }
    return this.get(id);
  }

  async remind(id: string, adminName: string, adminId?: string) {
    const fee = await this.get(id);
    const updated = await this.addMessage(id, {
      senderId: adminId,
      senderName: adminName,
      senderRole: "ADMIN",
      text: `Reminder: fee of Rs ${fee.amount} for ${fee.month} is ${fee.status}. Please pay soon.`,
    });
    await this.notifications.notifyUser({
      userId: fee.studentId,
      title: "Fee reminder",
      body: `Rs ${fee.amount} due for ${fee.courseTitle} (${fee.month})`,
      type: "FEE",
      data: { feeId: fee.id },
    });
    return updated;
  }

  async updateStatus(id: string, status: FeeStatus) {
    const fee = await this.get(id);
    await this.prisma.feeCase.update({ where: { id }, data: { status } });
    if (status === FeeStatus.PAID) {
      await this.notifications.notifyUser({
        userId: fee.studentId,
        title: "Fee approved",
        body: `${fee.courseTitle} · ${fee.month} marked paid`,
        type: "FEE",
        data: { feeId: fee.id, status: "PAID" },
      });
    }
    return this.get(id);
  }

  async paymentInfo() {
    return this.prisma.paymentInfo.findUnique({ where: { id: 1 } });
  }
}
