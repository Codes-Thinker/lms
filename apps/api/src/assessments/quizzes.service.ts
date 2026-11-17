import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationType,
  QuizAttemptStatus,
  QuizStatus,
} from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CertificatesService } from "./certificates.service";

type QuestionInput = {
  prompt: string;
  options: string[];
  correctIndex: number;
  points?: number;
  sortOrder?: number;
};

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly certificates: CertificatesService,
    private readonly notifications: NotificationsService
  ) {}

  async listForAdmin(courseId?: string) {
    return this.prisma.quiz.findMany({
      where: courseId ? { courseId } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        course: { select: { id: true, title: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    });
  }

  async listForStudent(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });
    const courseIds = enrollments.map((e) => e.courseId);
    if (!courseIds.length) return [];

    const quizzes = await this.prisma.quiz.findMany({
      where: {
        courseId: { in: courseIds },
        status: QuizStatus.PUBLISHED,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        course: { select: { id: true, title: true } },
        _count: { select: { questions: true } },
        attempts: {
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            percent: true,
            passed: true,
            submittedAt: true,
          },
        },
      },
    });

    return quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      courseId: q.courseId,
      courseTitle: q.course.title,
      passPercent: q.passPercent,
      timeLimitMinutes: q.timeLimitMinutes,
      maxAttempts: q.maxAttempts,
      questionCount: q._count.questions,
      attemptsUsed: q.attempts.length,
      bestPercent: q.attempts.reduce(
        (m, a) => Math.max(m, a.percent ?? 0),
        0
      ),
      passed: q.attempts.some((a) => a.passed),
      attempts: q.attempts,
    }));
  }

  async create(
    actorId: string,
    input: {
      courseId: string;
      title: string;
      description?: string;
      passPercent?: number;
      timeLimitMinutes?: number | null;
      shuffleQuestions?: boolean;
      maxAttempts?: number;
      issueCertificate?: boolean;
      questions?: QuestionInput[];
      publish?: boolean;
    }
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: input.courseId },
    });
    if (!course) throw new NotFoundException("Course not found");

    const questions = input.questions ?? [];
    this.validateQuestions(questions);

    return this.prisma.quiz.create({
      data: {
        courseId: input.courseId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        passPercent: input.passPercent ?? 70,
        timeLimitMinutes: input.timeLimitMinutes ?? null,
        shuffleQuestions: input.shuffleQuestions ?? false,
        maxAttempts: input.maxAttempts ?? 3,
        issueCertificate: input.issueCertificate ?? true,
        status: input.publish ? QuizStatus.PUBLISHED : QuizStatus.DRAFT,
        createdById: actorId,
        questions: {
          create: questions.map((q, i) => ({
            prompt: q.prompt.trim(),
            options: q.options,
            correctIndex: q.correctIndex,
            points: q.points ?? 1,
            sortOrder: q.sortOrder ?? i,
          })),
        },
      },
      include: {
        course: { select: { id: true, title: true } },
        questions: { orderBy: { sortOrder: "asc" } },
      },
    });
  }

  async update(
    id: string,
    input: {
      title?: string;
      description?: string | null;
      passPercent?: number;
      timeLimitMinutes?: number | null;
      shuffleQuestions?: boolean;
      maxAttempts?: number;
      issueCertificate?: boolean;
      status?: QuizStatus;
      questions?: QuestionInput[];
    }
  ) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException("Quiz not found");

    if (input.questions) {
      this.validateQuestions(input.questions);
      await this.prisma.quizQuestion.deleteMany({ where: { quizId: id } });
      await this.prisma.quizQuestion.createMany({
        data: input.questions.map((q, i) => ({
          quizId: id,
          prompt: q.prompt.trim(),
          options: q.options,
          correctIndex: q.correctIndex,
          points: q.points ?? 1,
          sortOrder: q.sortOrder ?? i,
        })),
      });
    }

    return this.prisma.quiz.update({
      where: { id },
      data: {
        title: input.title?.trim(),
        description:
          input.description === undefined
            ? undefined
            : input.description?.trim() || null,
        passPercent: input.passPercent,
        timeLimitMinutes: input.timeLimitMinutes,
        shuffleQuestions: input.shuffleQuestions,
        maxAttempts: input.maxAttempts,
        issueCertificate: input.issueCertificate,
        status: input.status,
      },
      include: {
        course: { select: { id: true, title: true } },
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { attempts: true } },
      },
    });
  }

  async getAdmin(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true } },
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { attempts: true } },
      },
    });
    if (!quiz) throw new NotFoundException("Quiz not found");
    return quiz;
  }

  /** Student view — never expose correctIndex. */
  async getForTake(id: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true } },
        questions: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!quiz || quiz.status !== QuizStatus.PUBLISHED) {
      throw new NotFoundException("Quiz not found");
    }
    await this.assertEnrolled(userId, quiz.courseId);

    const attempts = await this.prisma.quizAttempt.count({
      where: { quizId: id, userId },
    });
    if (attempts >= quiz.maxAttempts) {
      throw new ForbiddenException("Maximum attempts reached for this quiz");
    }

    let questions = quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options as string[],
      points: q.points,
      sortOrder: q.sortOrder,
    }));
    if (quiz.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      courseId: quiz.courseId,
      courseTitle: quiz.course.title,
      passPercent: quiz.passPercent,
      timeLimitMinutes: quiz.timeLimitMinutes,
      maxAttempts: quiz.maxAttempts,
      attemptsUsed: attempts,
      questions,
    };
  }

  async startAttempt(quizId: string, userId: string) {
    await this.getForTake(quizId, userId);
    const quiz = await this.prisma.quiz.findUniqueOrThrow({
      where: { id: quizId },
      include: { questions: true },
    });
    const maxScore = quiz.questions.reduce((s, q) => s + q.points, 0);
    return this.prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        status: QuizAttemptStatus.IN_PROGRESS,
        maxScore,
      },
    });
  }

  async submitAttempt(
    attemptId: string,
    userId: string,
    answers: Record<string, number>
  ) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
    });
    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException("Attempt not found");
    }
    if (attempt.status !== QuizAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException("Attempt already submitted");
    }

    if (
      attempt.quiz.timeLimitMinutes &&
      attempt.quiz.timeLimitMinutes > 0
    ) {
      const deadline =
        attempt.startedAt.getTime() +
        attempt.quiz.timeLimitMinutes * 60_000 +
        15_000; // small grace
      if (Date.now() > deadline) {
        // Still grade whatever was sent, but mark timed out in meta via percent calc
      }
    }

    let score = 0;
    const maxScore = attempt.quiz.questions.reduce((s, q) => s + q.points, 0);
    for (const q of attempt.quiz.questions) {
      const selected = answers[q.id];
      if (typeof selected === "number" && selected === q.correctIndex) {
        score += q.points;
      }
    }
    const percent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 1000) / 10;
    const passed = percent >= attempt.quiz.passPercent;

    const graded = await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        answers,
        score,
        maxScore,
        percent,
        passed,
        status: QuizAttemptStatus.GRADED,
        submittedAt: new Date(),
      },
    });

    await this.notifications.notifyUser({
      userId,
      title: passed ? "Quiz passed" : "Quiz result",
      body: `${attempt.quiz.title}: ${percent}% (${passed ? "passed" : "not passed"})`,
      type: NotificationType.QUIZ,
      data: {
        quizId: attempt.quizId,
        attemptId: graded.id,
        passed: String(passed),
      },
    });

    let certificate = null as Awaited<
      ReturnType<CertificatesService["issueForCourse"]>
    > | null;
    if (passed && attempt.quiz.issueCertificate) {
      certificate = await this.certificates.issueForCourse({
        userId,
        courseId: attempt.quiz.courseId,
        quizId: attempt.quizId,
        meta: { attemptId: graded.id, percent, score, maxScore },
      });
    }

    return {
      id: graded.id,
      score,
      maxScore,
      percent,
      passed,
      passPercent: attempt.quiz.passPercent,
      certificate,
      // Per-question feedback after submit only
      review: attempt.quiz.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options as string[],
        correctIndex: q.correctIndex,
        selectedIndex:
          typeof answers[q.id] === "number" ? answers[q.id] : null,
        correct: answers[q.id] === q.correctIndex,
        points: q.points,
      })),
    };
  }

  async delete(id: string) {
    await this.prisma.quiz.delete({ where: { id } });
    return { ok: true };
  }

  private validateQuestions(questions: QuestionInput[]) {
    if (!questions.length) {
      throw new BadRequestException("Add at least one question");
    }
    for (const [i, q] of questions.entries()) {
      if (!q.prompt?.trim()) {
        throw new BadRequestException(`Question ${i + 1} needs a prompt`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new BadRequestException(
          `Question ${i + 1} needs at least 2 options`
        );
      }
      if (
        typeof q.correctIndex !== "number" ||
        q.correctIndex < 0 ||
        q.correctIndex >= q.options.length
      ) {
        throw new BadRequestException(
          `Question ${i + 1} has an invalid correct option`
        );
      }
    }
  }

  private async assertEnrolled(userId: string, courseId: string) {
    const enr = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enr) {
      throw new ForbiddenException("Enroll in this course to take the quiz");
    }
  }
}
