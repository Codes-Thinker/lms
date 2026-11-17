import { Injectable, NotFoundException } from "@nestjs/common";
import { NotificationType, Prisma } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  private makeCode(): string {
    const raw = randomBytes(6).toString("hex").toUpperCase();
    return `CT-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  }

  async issueForCourse(input: {
    userId: string;
    courseId: string;
    quizId?: string;
    title?: string;
    meta?: Record<string, unknown>;
  }) {
    const [user, course] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: input.userId } }),
      this.prisma.course.findUnique({ where: { id: input.courseId } }),
    ]);
    if (!user) throw new NotFoundException("User not found");
    if (!course) throw new NotFoundException("Course not found");

    const existing = await this.prisma.certificate.findUnique({
      where: {
        userId_courseId: { userId: input.userId, courseId: input.courseId },
      },
    });
    if (existing) return this.map(existing, course.title);

    let code = this.makeCode();
    for (let i = 0; i < 5; i++) {
      const clash = await this.prisma.certificate.findUnique({
        where: { verificationCode: code },
      });
      if (!clash) break;
      code = this.makeCode();
    }

    const row = await this.prisma.certificate.create({
      data: {
        userId: input.userId,
        courseId: input.courseId,
        quizId: input.quizId,
        title:
          input.title ??
          `Certificate of Completion: ${course.title}`,
        recipientName: user.fullName,
        courseTitle: course.title,
        verificationCode: code,
        meta: (input.meta as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });

    await this.notifications.notifyUser({
      userId: input.userId,
      title: "Certificate issued",
      body: `You earned a certificate for ${course.title}`,
      type: NotificationType.CERTIFICATE,
      data: {
        certificateId: row.id,
        verificationCode: row.verificationCode,
        courseId: course.id,
      },
    });

    return this.map(row, course.title);
  }

  async listMine(userId: string) {
    const rows = await this.prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
      include: { course: { select: { id: true, title: true } } },
    });
    return rows.map((r) => this.map(r, r.course?.title ?? r.courseTitle));
  }

  async listAll(q?: { courseId?: string; userId?: string }) {
    const rows = await this.prisma.certificate.findMany({
      where: {
        courseId: q?.courseId || undefined,
        userId: q?.userId || undefined,
      },
      orderBy: { issuedAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });
    return rows.map((r) => ({
      ...this.map(r, r.course?.title ?? r.courseTitle),
      userEmail: r.user.email,
      userId: r.user.id,
    }));
  }

  async getMine(id: string, userId: string) {
    const row = await this.prisma.certificate.findFirst({
      where: { id, userId },
      include: { course: { select: { title: true } } },
    });
    if (!row) throw new NotFoundException("Certificate not found");
    return this.map(row, row.course?.title ?? row.courseTitle);
  }

  /** Public verification — no private emails. */
  async verify(code: string) {
    const normalized = code.trim().toUpperCase();
    const row = await this.prisma.certificate.findUnique({
      where: { verificationCode: normalized },
      include: {
        course: { select: { title: true } },
      },
    });
    if (!row) {
      return {
        valid: false,
        message: "Certificate not found",
      };
    }
    const fingerprint = createHash("sha256")
      .update(`${row.id}:${row.verificationCode}`)
      .digest("hex")
      .slice(0, 12);

    return {
      valid: true,
      verificationCode: row.verificationCode,
      title: row.title,
      recipientName: row.recipientName,
      courseTitle: row.course?.title ?? row.courseTitle,
      issuedAt: row.issuedAt.toISOString(),
      fingerprint,
    };
  }

  private map(
    row: {
      id: string;
      userId: string;
      courseId: string | null;
      quizId: string | null;
      title: string;
      recipientName: string;
      courseTitle: string | null;
      verificationCode: string;
      issuedAt: Date;
      meta?: unknown;
    },
    courseTitle?: string | null
  ) {
    return {
      id: row.id,
      userId: row.userId,
      courseId: row.courseId,
      quizId: row.quizId,
      title: row.title,
      recipientName: row.recipientName,
      courseTitle: courseTitle ?? row.courseTitle,
      verificationCode: row.verificationCode,
      issuedAt: row.issuedAt.toISOString(),
      meta: row.meta ?? null,
    };
  }
}
