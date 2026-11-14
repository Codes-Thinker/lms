import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FeeStatus, NotificationType } from "@prisma/client";
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
      const fee = await this.get(id);
      const shot = input.hasScreenshot ? "screenshot" : "message";
      await this.notifications.notifyAdmins({
        title: `Fee ${shot} · ${fee.studentName}`,
        body: `${fee.courseTitle} · ${fee.month} · Rs ${fee.amount}`,
        type: NotificationType.FEE,
        data: {
          feeId: fee.id,
          studentId: fee.studentId,
          kind: "FEE",
        },
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

  // ── Payment submission & verification ──

  /** Student submits a payment with screenshot proof. */
  async submitPayment(
    feeCaseId: string,
    studentId: string,
    data: { amount: number; screenshotData?: string; screenshotName?: string },
  ) {
    const fee = await this.prisma.feeCase.findUnique({
      where: { id: feeCaseId },
    });
    if (!fee) throw new NotFoundException("Fee case not found");
    if (fee.studentId !== studentId) {
      throw new ForbiddenException("This fee case does not belong to you");
    }

    // Create a payment submission record
    const submission = await this.prisma.paymentSubmission.create({
      data: {
        feeCaseId,
        studentId,
        amount: data.amount,
        screenshotData: data.screenshotData ?? null,
        screenshotName: data.screenshotName ?? null,
        status: "PENDING_VERIFICATION",
      },
    });

    // Update the fee case — mark as SENT (pending verification)
    await this.prisma.feeCase.update({
      where: { id: feeCaseId },
      data: {
        status: FeeStatus.SENT,
        paymentScreenshotData: data.screenshotData ?? null,
        paymentSubmittedAt: new Date(),
      },
    });

    // Add a chat message about the screenshot
    await this.prisma.feeMessage.create({
      data: {
        feeCaseId,
        senderId: studentId,
        senderName: (await this.prisma.user.findUnique({ where: { id: studentId } }))?.fullName ?? "Student",
        senderRole: "STUDENT",
        text: "Payment screenshot attached. Please verify.",
        hasScreenshot: Boolean(data.screenshotData),
      },
    });

    // Notify admins
    await this.notifications.notifyAdmins({
      title: "Payment submitted for verification",
      body: `${(await this.prisma.feeCase.findUnique({ where: { id: feeCaseId }, include: { student: true } }))?.student.fullName ?? "Student"} submitted Rs ${data.amount} for ${fee.courseTitle} (${fee.month})`,
      type: NotificationType.FEE,
      data: { feeId: feeCaseId, submissionId: submission.id, event: "payment_submitted" },
    });

    return this.get(feeCaseId);
  }

  /** Admin verifies or rejects a payment submission. */
  async verifyPayment(
    feeCaseId: string,
    reviewerId: string,
    data: { approved: boolean; rejectionReason?: string },
  ) {
    const fee = await this.prisma.feeCase.findUnique({
      where: { id: feeCaseId },
      include: { student: true },
    });
    if (!fee) throw new NotFoundException("Fee case not found");

    // Find the latest pending submission
    const submission = await this.prisma.paymentSubmission.findFirst({
      where: { feeCaseId, status: "PENDING_VERIFICATION" },
      orderBy: { createdAt: "desc" },
    });

    if (data.approved) {
      // Approve: mark fee as PAID, update submission
      await this.prisma.feeCase.update({
        where: { id: feeCaseId },
        data: { status: FeeStatus.PAID, rejectionReason: null },
      });
      if (submission) {
        await this.prisma.paymentSubmission.update({
          where: { id: submission.id },
          data: { status: "APPROVED", reviewedById: reviewerId, reviewedAt: new Date() },
        });
      }

      // Notify student
      await this.notifications.notifyUser({
        userId: fee.studentId,
        title: "Payment approved",
        body: `Your payment of Rs ${fee.amount} for ${fee.courseTitle} (${fee.month}) has been approved.`,
        type: NotificationType.FEE,
        data: { feeId: feeCaseId, status: "PAID", event: "payment_approved" },
      });

      // Add admin message
      await this.prisma.feeMessage.create({
        data: {
          feeCaseId,
          senderId: reviewerId,
          senderName: (await this.prisma.user.findUnique({ where: { id: reviewerId } }))?.fullName ?? "Admin",
          senderRole: "ADMIN",
          text: `Payment verified. Rs ${fee.amount} marked as paid.`,
          hasScreenshot: false,
        },
      });
    } else {
      // Reject: keep fee outstanding, set rejection reason
      await this.prisma.feeCase.update({
        where: { id: feeCaseId },
        data: { status: FeeStatus.REJECTED, rejectionReason: data.rejectionReason ?? "Payment could not be verified" },
      });
      if (submission) {
        await this.prisma.paymentSubmission.update({
          where: { id: submission.id },
          data: {
            status: "REJECTED",
            reviewedById: reviewerId,
            reviewedAt: new Date(),
            rejectionReason: data.rejectionReason,
          },
        });
      }

      // Notify student
      await this.notifications.notifyUser({
        userId: fee.studentId,
        title: "Payment rejected",
        body: `Your payment for ${fee.courseTitle} (${fee.month}) was rejected. ${data.rejectionReason ?? "Please submit corrected proof."}`,
        type: NotificationType.FEE,
        data: { feeId: feeCaseId, status: "REJECTED", event: "payment_rejected" },
      });

      // Add admin message
      await this.prisma.feeMessage.create({
        data: {
          feeCaseId,
          senderId: reviewerId,
          senderName: (await this.prisma.user.findUnique({ where: { id: reviewerId } }))?.fullName ?? "Admin",
          senderRole: "ADMIN",
          text: `Payment rejected. ${data.rejectionReason ?? "Please submit corrected proof."}`,
          hasScreenshot: false,
        },
      });
    }

    return this.get(feeCaseId);
  }

  /** Admin configures monthly fee for a student. */
  async configureStudentFee(
    studentId: string,
    data: {
      monthlyFee?: number;
      feeStartDate?: string;
      feeDueDay?: number;
      courseId?: string;
    },
  ) {
    // Update the user's fee configuration
    await this.prisma.user.update({
      where: { id: studentId },
      data: {
        monthlyFee: data.monthlyFee,
        feeStartDate: data.feeStartDate ? new Date(data.feeStartDate) : undefined,
        feeDueDay: data.feeDueDay,
      },
    });

    // If courseId provided, update or create a fee case for the current month
    if (data.courseId && data.monthlyFee) {
      const course = await this.prisma.course.findUnique({ where: { id: data.courseId } });
      const now = new Date();
      const monthLabel = now.toLocaleString("en-US", { month: "short", year: "numeric" });
      const dueDate = new Date(now.getFullYear(), now.getMonth(), data.feeDueDay ?? 15);

      const existing = await this.prisma.feeCase.findFirst({
        where: { studentId, courseId: data.courseId, month: monthLabel },
      });

      if (existing) {
        await this.prisma.feeCase.update({
          where: { id: existing.id },
          data: {
            amount: data.monthlyFee,
            monthlyFee: data.monthlyFee,
            dueDay: data.feeDueDay ?? 15,
            billingStart: data.feeStartDate ? new Date(data.feeStartDate) : undefined,
          },
        });
      } else {
        await this.prisma.feeCase.create({
          data: {
            studentId,
            courseId: data.courseId,
            courseTitle: course?.title ?? "Course",
            month: monthLabel,
            amount: data.monthlyFee,
            status: FeeStatus.DUE,
            dueDate,
            monthlyFee: data.monthlyFee,
            dueDay: data.feeDueDay ?? 15,
            billingStart: data.feeStartDate ? new Date(data.feeStartDate) : null,
          },
        });
      }
    }

    return { ok: true };
  }

  /** Admin gets pending payment submissions. */
  async listSubmissions(status?: string) {
    return this.prisma.paymentSubmission.findMany({
      where: status ? { status } : undefined,
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        feeCase: { select: { id: true, courseTitle: true, month: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  /** Get submissions for a specific fee case. */
  async submissionsForFee(feeCaseId: string) {
    return this.prisma.paymentSubmission.findMany({
      where: { feeCaseId },
      orderBy: { createdAt: "desc" },
    });
  }
}
