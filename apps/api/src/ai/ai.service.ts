import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

type ChatTurn = { role: "user" | "assistant" | "system"; content: string };

@Injectable()
export class AiService {
  private readonly log = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  status() {
    const configured = Boolean(this.config.get<string>("AI_API_KEY")?.trim());
    return {
      enabled: true,
      providerConfigured: configured,
      model: this.config.get<string>("AI_MODEL") ?? "gpt-4o-mini",
      dailyLimit: this.dailyLimit(),
      mode: configured ? "llm" : "local",
    };
  }

  private dailyLimit() {
    return Math.max(5, Number(this.config.get("AI_DAILY_LIMIT_PER_USER") ?? 40));
  }

  async history(userId: string, take = 40) {
    const rows = await this.prisma.aiMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
    });
    return rows.reverse().map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      courseId: r.courseId,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async clearHistory(userId: string) {
    await this.prisma.aiMessage.deleteMany({ where: { userId } });
    return { ok: true };
  }

  async usageSummary() {
    const since = new Date(Date.now() - 7 * 24 * 3600_000);
    const [total, week, fails, byUser] = await Promise.all([
      this.prisma.aiUsageLog.count(),
      this.prisma.aiUsageLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.aiUsageLog.count({ where: { ok: false, createdAt: { gte: since } } }),
      this.prisma.aiUsageLog.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { userId: "desc" } },
        take: 20,
      }),
    ]);
    const users = await this.prisma.user.findMany({
      where: { id: { in: byUser.map((u) => u.userId) } },
      select: { id: true, fullName: true, email: true },
    });
    const map = new Map(users.map((u) => [u.id, u]));
    return {
      totalAllTime: total,
      weekRequests: week,
      weekFailures: fails,
      topUsers: byUser.map((u) => ({
        userId: u.userId,
        count: u._count._all,
        name: map.get(u.userId)?.fullName ?? null,
        email: map.get(u.userId)?.email ?? null,
      })),
      status: this.status(),
    };
  }

  async chat(
    userId: string,
    input: { message: string; courseId?: string }
  ) {
    const message = (input.message ?? "").trim();
    if (message.length < 2) {
      throw new BadRequestException("Message is too short");
    }
    if (message.length > 4000) {
      throw new BadRequestException("Message is too long");
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const usedToday = await this.prisma.aiUsageLog.count({
      where: { userId, createdAt: { gte: dayStart }, ok: true },
    });
    if (usedToday >= this.dailyLimit()) {
      throw new BadRequestException(
        `Daily AI limit reached (${this.dailyLimit()}). Try again tomorrow.`
      );
    }

    const context = await this.buildLearnerContext(userId, input.courseId);
    const recent = await this.prisma.aiMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    const history: ChatTurn[] = recent
      .reverse()
      .map((r) => ({
        role: r.role === "assistant" ? "assistant" : "user",
        content: r.content,
      }));

    await this.prisma.aiMessage.create({
      data: {
        userId,
        role: "user",
        content: message,
        courseId: input.courseId || null,
      },
    });

    const apiKey = this.config.get<string>("AI_API_KEY")?.trim();
    let reply: string;
    let provider = "local";
    let model: string | null = null;
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      if (apiKey) {
        const result = await this.callLlm({
          apiKey,
          context,
          history,
          message,
        });
        reply = result.text;
        provider = "openai-compatible";
        model = result.model;
        promptTokens = result.promptTokens;
        completionTokens = result.completionTokens;
      } else {
        reply = this.localCoach(message, context);
      }

      await this.prisma.aiMessage.create({
        data: {
          userId,
          role: "assistant",
          content: reply,
          courseId: input.courseId || null,
        },
      });
      await this.prisma.aiUsageLog.create({
        data: {
          userId,
          provider,
          model,
          promptTokens,
          completionTokens,
          ok: true,
        },
      });

      return {
        reply,
        mode: provider === "local" ? "local" : "llm",
        remainingToday: Math.max(0, this.dailyLimit() - usedToday - 1),
      };
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      this.log.warn(`AI chat failed: ${err}`);
      await this.prisma.aiUsageLog.create({
        data: {
          userId,
          provider: apiKey ? "openai-compatible" : "local",
          model,
          ok: false,
          error: err.slice(0, 500),
        },
      });
      if (e instanceof BadRequestException) throw e;
      // Fall back to local coach so the app still helps the student.
      reply = this.localCoach(message, context);
      await this.prisma.aiMessage.create({
        data: {
          userId,
          role: "assistant",
          content: reply,
          courseId: input.courseId || null,
        },
      });
      return {
        reply,
        mode: "local-fallback",
        remainingToday: Math.max(0, this.dailyLimit() - usedToday - 1),
        warning: "Cloud AI unavailable; used local study coach.",
      };
    }
  }

  private async buildLearnerContext(userId: string, courseId?: string) {
    const [user, enrollments, quizzes, certs] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, accountType: true, track: true },
      }),
      this.prisma.enrollment.findMany({
        where: { userId },
        include: { course: { select: { id: true, title: true, category: true } } },
        take: 12,
      }),
      this.prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { quiz: { select: { title: true, passPercent: true } } },
      }),
      this.prisma.certificate.findMany({
        where: { userId },
        orderBy: { issuedAt: "desc" },
        take: 5,
        select: { title: true, courseTitle: true, verificationCode: true },
      }),
    ]);

    const focusCourse = courseId
      ? enrollments.find((e) => e.courseId === courseId)?.course
      : null;

    return {
      name: user?.fullName ?? "Student",
      role: user?.accountType ?? "STUDENT",
      track: user?.track ?? null,
      courses: enrollments.map((e) => ({
        id: e.course.id,
        title: e.course.title,
        category: e.course.category,
      })),
      focusCourse: focusCourse
        ? { id: focusCourse.id, title: focusCourse.title }
        : null,
      recentQuizAttempts: quizzes.map((a) => ({
        quiz: a.quiz.title,
        percent: a.percent,
        passed: a.passed,
      })),
      certificates: certs,
    };
  }

  private async callLlm(input: {
    apiKey: string;
    context: Awaited<ReturnType<AiService["buildLearnerContext"]>>;
    history: ChatTurn[];
    message: string;
  }) {
    const base = (
      this.config.get<string>("AI_BASE_URL") ?? "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const model = this.config.get<string>("AI_MODEL") ?? "gpt-4o-mini";

    const system = [
      "You are the Codes Thinker LMS Study Coach.",
      "Help students and interns learn clearly, kindly, and practically.",
      "Explain concepts, suggest revision plans, and quiz them lightly when useful.",
      "Do not invent grades, fees, or admin actions. Do not ask for passwords.",
      "Keep answers concise and actionable (short paragraphs or bullets).",
      `Learner: ${input.context.name} (${input.context.role})`,
      input.context.track ? `Track: ${input.context.track}` : "",
      input.context.focusCourse
        ? `Focus course: ${input.context.focusCourse.title}`
        : "",
      `Enrolled courses: ${
        input.context.courses.map((c) => c.title).join(", ") || "none"
      }`,
      input.context.recentQuizAttempts.length
        ? `Recent quiz results: ${input.context.recentQuizAttempts
            .map(
              (a) =>
                `${a.quiz} ${a.percent}% (${a.passed ? "passed" : "not passed"})`
            )
            .join("; ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        messages: [
          { role: "system", content: system },
          ...input.history.slice(-6),
          { role: "user", content: input.message },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new ServiceUnavailableException(
        `AI provider error (${res.status}): ${text.slice(0, 200)}`
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new ServiceUnavailableException("Empty AI response");
    }
    return {
      text,
      model: data.model ?? model,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
    };
  }

  /** Offline / no-key coach grounded in LMS data. */
  private localCoach(
    message: string,
    context: Awaited<ReturnType<AiService["buildLearnerContext"]>>
  ) {
    const q = message.toLowerCase();
    const courseList =
      context.courses.map((c) => `• ${c.title}`).join("\n") ||
      "• No enrollments yet. Ask admin to enroll you in a course.";

    if (/certificate|cert\b/.test(q)) {
      if (context.certificates.length) {
        return [
          `Hi ${context.name}, you already have:`,
          ...context.certificates.map(
            (c) =>
              `• ${c.title}${c.courseTitle ? ` (${c.courseTitle})` : ""}, code ${c.verificationCode}`
          ),
          "",
          "Pass a published course quiz to earn more certificates.",
        ].join("\n");
      }
      return `Hi ${context.name}. You do not have a certificate yet. Open Quizzes, take a published course quiz, and pass it to earn one.`;
    }

    if (/quiz|exam|test|mcq/.test(q)) {
      const recent = context.recentQuizAttempts[0];
      return [
        `Hi ${context.name}. For quizzes:`,
        "1. Open Help → Quizzes",
        "2. Take a published quiz for an enrolled course",
        "3. Answers are graded on the server",
        recent
          ? `Your latest result: ${recent.quiz} at ${recent.percent}% (${recent.passed ? "passed" : "not passed"}).`
          : "No attempts yet — start with one short practice pass.",
      ].join("\n");
    }

    if (/plan|study|revise|revision|schedule/.test(q)) {
      return [
        `Study plan for ${context.name}:`,
        "Today (45–60 min):",
        "1. Review one enrolled course topic",
        "2. Write 5 flash questions for yourself",
        "3. Take or retake a quiz if available",
        "",
        "Your courses:",
        courseList,
        context.focusCourse
          ? `\nFocus first on: ${context.focusCourse.title}`
          : "",
      ].join("\n");
    }

    if (/fee|payment|jazzcash|easypaisa/.test(q)) {
      return `For fees, open Help → Fees & payments. Upload a clear screenshot after transfer. Admin verifies payments from the dashboard. I cannot change fee status myself.`;
    }

    return [
      `Hi ${context.name}. I am your Codes Thinker study coach.`,
      "Ask me about study plans, quiz prep, certificates, or a concept you are stuck on.",
      "",
      "Your courses:",
      courseList,
      "",
      "Tip: mention the topic name for a clearer explanation.",
    ].join("\n");
  }
}
