import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { FeeStatus, NotificationType } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FeesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FeesService.name);
  private reminderTimer: ReturnType<typeof setInterval> | null = null;
  private lastCronDayKey = "";

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  onModuleInit() {
    // Run every 15 minutes; day-gated so 3rd/5th reminders fire once per day.
    this.reminderTimer = setInterval(() => {
      void this.runScheduledFeeReminders().catch((e) =>
        this.logger.warn(`Fee reminder cron failed: ${e}`)
      );
    }, 15 * 60_000);
    void this.runScheduledFeeReminders().catch(() => {});
  }

  onModuleDestroy() {
    if (this.reminderTimer) clearInterval(this.reminderTimer);
  }

  private map(f: {
    id: string;
    studentId: string;
    courseId: string | null;
    courseTitle: string;
    month: string;
    amount: number;
    amountPaid?: number;
    status: FeeStatus;
    dueDate: Date;
    monthlyFee?: number | null;
    dueDay?: number;
    paymentScreenshotData?: string | null;
    student: {
      fullName: string;
      batch?: { code: string; name: string } | null;
      courseDurationMonths?: number | null;
      totalCourseFee?: number | null;
      monthlyFee?: number | null;
      paymentType?: string | null;
    };
    course?: { id: string; title: string; batchLabel: string | null; durationMonths: number } | null;
    messages: {
      id: string;
      senderName: string;
      senderRole: string;
      text: string;
      hasScreenshot: boolean;
      createdAt: Date;
    }[];
    reminderLogs?: { id: string; kind: string; sentAt: Date }[];
    submissions?: { amount: number; status: string }[];
  }) {
    const paidFromSubs = (f.submissions ?? [])
      .filter((s) => s.status === "APPROVED")
      .reduce((s, x) => s + x.amount, 0);
    const amountPaid = Math.max(f.amountPaid ?? 0, paidFromSubs);
    const remaining = Math.max(0, f.amount - amountPaid);
    const totalCourseFee =
      f.student.totalCourseFee ??
      (f.monthlyFee && f.student.courseDurationMonths
        ? f.monthlyFee * f.student.courseDurationMonths
        : null);
    return {
      id: f.id,
      studentId: f.studentId,
      studentName: f.student.fullName,
      courseId: f.courseId,
      courseTitle: f.courseTitle,
      batch: f.student.batch?.code ?? f.course?.batchLabel ?? null,
      courseDurationMonths:
        f.student.courseDurationMonths ?? f.course?.durationMonths ?? null,
      month: f.month,
      amount: f.amount,
      monthlyFee: f.monthlyFee ?? f.student.monthlyFee ?? f.amount,
      totalCourseFee,
      amountPaid,
      remainingBalance: remaining,
      nextPaymentDate: f.dueDate.toISOString().slice(0, 10),
      paymentType: f.student.paymentType ?? null,
      status: f.status,
      dueDate: f.dueDate.toISOString().slice(0, 10),
      dueDay: f.dueDay ?? 5,
      hasScreenshot: Boolean(f.paymentScreenshotData),
      paymentScreenshotData: f.paymentScreenshotData ?? null,
      reminders: (f.reminderLogs ?? []).map((r) => ({
        id: r.id,
        kind: r.kind,
        sentAt: r.sentAt.toISOString(),
      })),
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

  async list(studentId?: string, courseId?: string) {
    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;
    // Student "my fees" needs chat; admin list stays light (no full chat dump).
    const includeChat = Boolean(studentId);
    const rows = await this.prisma.feeCase.findMany({
      where,
      include: {
        student: {
          select: {
            fullName: true,
            monthlyFee: true,
            totalCourseFee: true,
            courseDurationMonths: true,
            paymentType: true,
            batch: { select: { code: true, name: true } },
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            batchLabel: true,
            durationMonths: true,
          },
        },
        messages: includeChat
          ? { orderBy: { createdAt: "asc" } }
          : false,
        reminderLogs: {
          select: { id: true, kind: true, sentAt: true },
          orderBy: { sentAt: "desc" },
          take: 5,
        },
        submissions: {
          select: {
            id: true,
            amount: true,
            status: true,
            // Keep list light — full screenshotData is fetched on review.
            screenshotName: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { dueDate: "desc" },
    });
    return rows.map((r) => {
      const shotOnCase = (r as { paymentScreenshotData?: string | null })
        .paymentScreenshotData;
      const mapped = this.map({
        ...r,
        messages: includeChat && Array.isArray(r.messages) ? r.messages : [],
        paymentScreenshotData: shotOnCase,
      });
      const pendingSub = (r.submissions ?? []).find(
        (s) => s.status === "PENDING_VERIFICATION"
      );
      return {
        ...mapped,
        hasPendingScreenshot: Boolean(
          pendingSub || (shotOnCase && r.status === FeeStatus.SENT)
        ),
        pendingSubmission: pendingSub
          ? {
              id: pendingSub.id,
              amount: pendingSub.amount,
              screenshotName: pendingSub.screenshotName,
              createdAt: pendingSub.createdAt.toISOString(),
            }
          : null,
        // Student "my fees" needs the image preview; admin list stays light.
        paymentScreenshotData: includeChat ? shotOnCase || null : null,
      };
    });
  }

  async get(id: string) {
    const row = await this.prisma.feeCase.findUnique({
      where: { id },
      include: {
        student: { include: { batch: true } },
        course: {
          select: {
            id: true,
            title: true,
            batchLabel: true,
            durationMonths: true,
          },
        },
        messages: { orderBy: { createdAt: "asc" } },
        reminderLogs: { orderBy: { sentAt: "desc" } },
        submissions: { select: { amount: true, status: true } },
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

  async remind(
    id: string,
    adminName: string,
    adminId?: string,
    kind: "MANUAL" | "FIRST" | "FINAL" = "MANUAL"
  ) {
    const fee = await this.get(id);
    if (fee.status === "PAID" || fee.status === "WAIVED") {
      return fee;
    }
    if (kind !== "MANUAL") {
      const existing = await this.prisma.feeReminderLog.findUnique({
        where: { feeCaseId_kind: { feeCaseId: id, kind } },
      });
      if (existing) return fee;
    }

    const label =
      kind === "FIRST"
        ? "First reminder (3rd)"
        : kind === "FINAL"
          ? "Final reminder (5th — deadline)"
          : "Reminder";
    const updated = await this.addMessage(id, {
      senderId: adminId,
      senderName: adminName,
      senderRole: "ADMIN",
      text: `${label}: fee of Rs ${fee.amount} for ${fee.month} is ${fee.status}. Please pay soon.`,
    });
    await this.notifications.notifyUser({
      userId: fee.studentId,
      title: kind === "FINAL" ? "Final fee reminder" : "Fee reminder",
      body: `Rs ${fee.amount} due for ${fee.courseTitle} (${fee.month})`,
      type: "FEE",
      data: { feeId: fee.id, reminderKind: kind },
    });
    await this.prisma.feeReminderLog.upsert({
      where: { feeCaseId_kind: { feeCaseId: id, kind } },
      update: { sentAt: new Date() },
      create: { feeCaseId: id, kind },
    });
    return updated;
  }

  async updateStatus(id: string, status: FeeStatus) {
    const fee = await this.get(id);
    const data: { status: FeeStatus; amountPaid?: number } = { status };
    if (status === FeeStatus.PAID) data.amountPaid = fee.amount;
    if (status === FeeStatus.WAIVED) data.amountPaid = fee.amountPaid ?? 0;
    await this.prisma.feeCase.update({ where: { id }, data });
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

  /**
   * Karachi calendar day: on the 3rd send FIRST reminders; on the 5th send FINAL
   * and mark unpaid cases OVERDUE after the 5th.
   */
  async runScheduledFeeReminders() {
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })
    );
    const day = now.getDate();
    const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${day}`;
    if (this.lastCronDayKey === dayKey && day !== 3 && day !== 5 && day !== 6) {
      return { skipped: true };
    }

    // Ensure monthly fee cases exist for active students with a plan.
    await this.ensureMonthlyFeeCases(now);

    const open = await this.prisma.feeCase.findMany({
      where: {
        status: { in: [FeeStatus.DUE, FeeStatus.SENT, FeeStatus.PARTIAL, FeeStatus.REJECTED, FeeStatus.OVERDUE] },
      },
      select: { id: true, status: true },
    });

    let first = 0;
    let final = 0;
    let overdue = 0;

    if (day === 3) {
      for (const f of open) {
        await this.remind(f.id, "LMS Scheduler", undefined, "FIRST");
        first += 1;
      }
      this.lastCronDayKey = dayKey;
    }

    if (day === 5) {
      for (const f of open) {
        await this.remind(f.id, "LMS Scheduler", undefined, "FINAL");
        final += 1;
      }
      this.lastCronDayKey = dayKey;
    }

    if (day > 5) {
      const res = await this.prisma.feeCase.updateMany({
        where: {
          status: { in: [FeeStatus.DUE, FeeStatus.SENT, FeeStatus.PARTIAL, FeeStatus.REJECTED] },
          dueDate: { lt: now },
        },
        data: { status: FeeStatus.OVERDUE },
      });
      overdue = res.count;
      this.lastCronDayKey = dayKey;
    }

    this.logger.log(
      `Fee cron day=${day} first=${first} final=${final} overdue=${overdue}`
    );
    return { day, first, final, overdue };
  }

  /** Create current-month FeeCase rows for students who have monthlyFee + enrollments. */
  async ensureMonthlyFeeCases(now = new Date()) {
    const monthLabel = now.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "Asia/Karachi",
    });
    const students = await this.prisma.user.findMany({
      where: {
        accountType: "STUDENT",
        status: "ACTIVE",
        monthlyFee: { gt: 0 },
        enrollments: { some: {} },
      },
      include: {
        enrollments: {
          include: { course: { select: { id: true, title: true } } },
          take: 1,
          orderBy: { enrolledAt: "asc" },
        },
      },
    });

    let created = 0;
    for (const s of students) {
      const enr = s.enrollments[0];
      if (!enr) continue;
      const existing = await this.prisma.feeCase.findFirst({
        where: {
          studentId: s.id,
          courseId: enr.courseId,
          month: monthLabel,
        },
      });
      if (existing) continue;
      const dueDay = s.feeDueDay || 5;
      const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
      await this.prisma.feeCase.create({
        data: {
          studentId: s.id,
          courseId: enr.courseId,
          courseTitle: enr.course.title,
          month: monthLabel,
          amount: s.monthlyFee!,
          status: FeeStatus.DUE,
          dueDate,
          monthlyFee: s.monthlyFee!,
          dueDay,
          billingStart: s.feeStartDate,
        },
      });
      created += 1;
    }
    return { created };
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
      const paidAmount = submission?.amount ?? fee.amount;
      await this.prisma.feeCase.update({
        where: { id: feeCaseId },
        data: {
          status: FeeStatus.PAID,
          rejectionReason: null,
          amountPaid: paidAmount,
        },
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

  /** Admin configures monthly fee / payment plan for a student. */
  async configureStudentFee(
    studentId: string,
    data: {
      monthlyFee?: number;
      feeStartDate?: string;
      feeDueDay?: number;
      courseId?: string;
      paymentType?: "MONTHLY" | "TWO_INSTALLMENTS" | "CUSTOM";
      installment1Amount?: number;
      installment2Amount?: number;
      courseDurationMonths?: number;
      totalCourseFee?: number;
    },
  ) {
    await this.prisma.user.update({
      where: { id: studentId },
      data: {
        monthlyFee: data.monthlyFee,
        feeStartDate: data.feeStartDate ? new Date(data.feeStartDate) : undefined,
        feeDueDay: data.feeDueDay,
        paymentType: data.paymentType,
        installment1Amount: data.installment1Amount,
        installment2Amount: data.installment2Amount,
        courseDurationMonths: data.courseDurationMonths,
        totalCourseFee: data.totalCourseFee,
      },
    });

    if (data.courseId) {
      await this.prisma.enrollment.upsert({
        where: {
          userId_courseId: { userId: studentId, courseId: data.courseId },
        },
        update: {},
        create: { userId: studentId, courseId: data.courseId },
      });
    }

    if (data.courseId && data.monthlyFee) {
      const course = await this.prisma.course.findUnique({
        where: { id: data.courseId },
      });
      const now = new Date();
      const monthLabel = now.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });
      const dueDay = data.feeDueDay ?? 5;
      const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
      const amount =
        data.paymentType === "TWO_INSTALLMENTS" && data.installment1Amount
          ? data.installment1Amount
          : data.monthlyFee;

      const existing = await this.prisma.feeCase.findFirst({
        where: { studentId, courseId: data.courseId, month: monthLabel },
      });

      if (existing) {
        await this.prisma.feeCase.update({
          where: { id: existing.id },
          data: {
            amount,
            monthlyFee: data.monthlyFee,
            dueDay,
            billingStart: data.feeStartDate
              ? new Date(data.feeStartDate)
              : undefined,
          },
        });
      } else {
        await this.prisma.feeCase.create({
          data: {
            studentId,
            courseId: data.courseId,
            courseTitle: course?.title ?? "Course",
            month: monthLabel,
            amount,
            status: FeeStatus.DUE,
            dueDate,
            monthlyFee: data.monthlyFee,
            dueDay,
            billingStart: data.feeStartDate
              ? new Date(data.feeStartDate)
              : null,
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
