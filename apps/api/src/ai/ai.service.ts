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

  private readApiKey(): string {
    let key = (this.config.get<string>("AI_API_KEY") ?? "").trim();
    // Render paste quirks: wrapping quotes or KEY=value.
    if (key.startsWith("AI_API_KEY=")) {
      key = key.slice("AI_API_KEY=".length).trim();
    }
    if (
      (key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'"))
    ) {
      key = key.slice(1, -1).trim();
    }
    return key;
  }

  status() {
    const configured = Boolean(this.readApiKey());
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

  /** Recent student ↔ coach turns for admin visibility. */
  async adminTranscripts(take = 60) {
    const limit = Math.min(120, Math.max(10, take));
    const rows = await this.prisma.aiMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            accountType: true,
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      courseId: r.courseId,
      createdAt: r.createdAt.toISOString(),
      user: {
        id: r.user.id,
        name: r.user.fullName,
        email: r.user.email,
        accountType: r.user.accountType,
      },
    }));
  }

  private async buildAdminOpsSnapshot() {
    const since = new Date(Date.now() - 7 * 24 * 3600_000);
    const [
      dueFees,
      overdueFees,
      openTickets,
      pendingEnrollments,
      activeStudents,
      weekAiFails,
      recentUserMsgs,
    ] = await Promise.all([
      this.prisma.feeCase.count({
        where: { status: { in: ["DUE", "SENT", "PARTIAL"] } },
      }),
      this.prisma.feeCase.count({ where: { status: "OVERDUE" } }),
      this.prisma.supportTicket.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
      this.prisma.enrollmentRequest.count({ where: { status: "PENDING" } }),
      this.prisma.user.count({
        where: { accountType: "STUDENT", status: "ACTIVE" },
      }),
      this.prisma.aiUsageLog.count({
        where: { ok: false, createdAt: { gte: since } },
      }),
      this.prisma.aiMessage.findMany({
        where: { role: "user", createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          user: { select: { fullName: true, email: true } },
        },
      }),
    ]);

    const feeSamples = await this.prisma.feeCase.findMany({
      where: { status: { in: ["DUE", "SENT", "PARTIAL", "OVERDUE"] } },
      orderBy: { dueDate: "asc" },
      take: 8,
      select: {
        courseTitle: true,
        month: true,
        amount: true,
        status: true,
        student: { select: { fullName: true, email: true } },
      },
    });

    const ticketSamples = await this.prisma.supportTicket.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        kind: true,
        title: true,
        status: true,
        user: { select: { fullName: true, email: true } },
      },
    });

    return {
      activeStudents,
      dueFees,
      overdueFees,
      openTickets,
      pendingEnrollments,
      weekAiFails,
      feeSamples: feeSamples.map((f) => ({
        student: f.student.fullName || f.student.email,
        course: f.courseTitle,
        month: f.month,
        amount: f.amount,
        status: f.status,
      })),
      ticketSamples: ticketSamples.map((t) => ({
        student: t.user.fullName || t.user.email,
        kind: t.kind,
        title: t.title,
        status: t.status,
      })),
      recentStudentPrompts: recentUserMsgs.map((m) => ({
        student: m.user.fullName || m.user.email,
        text: m.content.slice(0, 180),
        at: m.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Admin ops assistant — read-only advice from live LMS snapshot.
   * Does not mutate fees/tickets/users; tells admin what to check next.
   */
  async adminAssist(adminUserId: string, messageRaw: string) {
    const message = (messageRaw ?? "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .trim();
    if (message.length < 2) {
      throw new BadRequestException("Message is too short");
    }
    if (message.length > 4000) {
      throw new BadRequestException("Message is too long");
    }

    const snapshot = await this.buildAdminOpsSnapshot();
    const apiKey = this.readApiKey();

    const system = [
      "You are the Codes Thinker LMS Admin Copilot.",
      "Help SUPER_ADMIN / STAFF prioritize work using the live snapshot below.",
      "You are READ-ONLY: never claim you changed fees, enrollments, tickets, or users.",
      "Suggest concrete next clicks: Fees, Enrollments, Chat inbox, Feedback, Courses, AI coach transcripts.",
      "Be concise with bullets. If asked for student study tutoring, say that is the mobile Study Coach.",
      "Safety: no passwords, no bulk destructive actions, no inventing student data.",
      "",
      "SNAPSHOT:",
      `Active students: ${snapshot.activeStudents}`,
      `Fee cases needing attention (due/sent/partial): ${snapshot.dueFees}`,
      `Overdue fees: ${snapshot.overdueFees}`,
      `Open support tickets: ${snapshot.openTickets}`,
      `Pending enrollment requests: ${snapshot.pendingEnrollments}`,
      `AI provider failures (7d): ${snapshot.weekAiFails}`,
      snapshot.feeSamples.length
        ? `Fee samples:\n${snapshot.feeSamples
            .map(
              (f) =>
                `• ${f.student} — ${f.course} / ${f.month} — ${f.amount} (${f.status})`
            )
            .join("\n")}`
        : "Fee samples: none",
      snapshot.ticketSamples.length
        ? `Ticket samples:\n${snapshot.ticketSamples
            .map(
              (t) =>
                `• ${t.student} — [${t.kind}] ${t.title} (${t.status})`
            )
            .join("\n")}`
        : "Ticket samples: none",
      snapshot.recentStudentPrompts.length
        ? `Recent student AI prompts:\n${snapshot.recentStudentPrompts
            .map((p) => `• ${p.student}: ${p.text}`)
            .join("\n")}`
        : "Recent student AI prompts: none",
    ].join("\n");

    let reply: string;
    let mode = "local";

    try {
      if (apiKey) {
        const base = (
          this.config.get<string>("AI_BASE_URL") ?? "https://api.openai.com/v1"
        ).replace(/\/$/, "");
        const model = this.config.get<string>("AI_MODEL") ?? "gpt-4o-mini";
        const res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.3,
            messages: [
              { role: "system", content: system },
              { role: "user", content: message },
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
        };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text) throw new ServiceUnavailableException("Empty AI response");
        reply = text;
        mode = "llm";
        await this.prisma.aiUsageLog.create({
          data: {
            userId: adminUserId,
            provider: "openai-compatible",
            model,
            ok: true,
          },
        });
      } else {
        reply = this.localAdminAssist(message, snapshot);
        await this.prisma.aiUsageLog.create({
          data: {
            userId: adminUserId,
            provider: "local",
            ok: true,
          },
        });
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      this.log.warn(`Admin assist failed: ${err}`);
      await this.prisma.aiUsageLog.create({
        data: {
          userId: adminUserId,
          provider: apiKey ? "openai-compatible" : "local",
          ok: false,
          error: err.slice(0, 500),
        },
      });
      reply = this.localAdminAssist(message, snapshot);
      mode = "local-fallback";
    }

    return { reply, mode, snapshot };
  }

  private localAdminAssist(
    message: string,
    snapshot: Awaited<ReturnType<AiService["buildAdminOpsSnapshot"]>>
  ) {
    const q = message.toLowerCase();
    if (/fee|payment|overdue|due/.test(q)) {
      return [
        `Fees needing attention: ${snapshot.dueFees} (overdue ${snapshot.overdueFees}).`,
        ...snapshot.feeSamples
          .slice(0, 5)
          .map(
            (f) =>
              `• ${f.student} — ${f.course} / ${f.month} — Rs ${f.amount} (${f.status})`
          ),
        "",
        "Next: open Fees in the admin sidebar and verify screenshots / mark paid.",
      ].join("\n");
    }
    if (/ticket|inbox|complain|feedback|support/.test(q)) {
      return [
        `Open tickets: ${snapshot.openTickets}.`,
        ...snapshot.ticketSamples.map(
          (t) => `• ${t.student} — [${t.kind}] ${t.title}`
        ),
        "",
        "Next: Chat inbox / Feedback to reply.",
      ].join("\n");
    }
    if (/enroll|request/.test(q)) {
      return `Pending enrollment requests: ${snapshot.pendingEnrollments}. Open Enrollments to approve/reject.`;
    }
    if (/ai|coach|prompt|student ask/.test(q)) {
      return [
        `AI failures (7d): ${snapshot.weekAiFails}.`,
        "Recent student prompts:",
        ...snapshot.recentStudentPrompts.map(
          (p) => `• ${p.student}: ${p.text}`
        ),
        "",
        "Full threads are in the Transcripts list on this page.",
      ].join("\n");
    }
    return [
      "Admin priority snapshot:",
      `• Active students: ${snapshot.activeStudents}`,
      `• Fees to review: ${snapshot.dueFees} (overdue ${snapshot.overdueFees})`,
      `• Open tickets: ${snapshot.openTickets}`,
      `• Pending enrollments: ${snapshot.pendingEnrollments}`,
      `• AI failures (7d): ${snapshot.weekAiFails}`,
      "",
      "Ask me about fees, tickets, enrollments, or student AI prompts — I suggest what to open next (I cannot change data myself).",
    ].join("\n");
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

    const apiKey = this.readApiKey();
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
        warning: this.friendlyCloudWarning(err),
      };
    }
  }

  /** Short, actionable reason when OpenAI/cloud call fails. */
  private friendlyCloudWarning(err: string): string {
    const lower = err.toLowerCase();
    if (
      lower.includes("insufficient_quota") ||
      lower.includes("billing") ||
      lower.includes("exceeded") ||
      lower.includes("credit")
    ) {
      return "OpenAI credits/billing missing — add credits at platform.openai.com, then retry.";
    }
    if (
      lower.includes("invalid_api_key") ||
      lower.includes("incorrect api key") ||
      lower.includes("(401)")
    ) {
      return "AI_API_KEY invalid on Render — paste a fresh secret key (no quotes) and redeploy.";
    }
    if (lower.includes("model") && lower.includes("404")) {
      return "AI_MODEL not available — set AI_MODEL=gpt-4o-mini on Render.";
    }
    return "Cloud AI unavailable; used local study coach.";
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
