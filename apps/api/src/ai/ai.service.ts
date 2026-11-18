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

  /** Block clearly unsafe prompts before calling the cloud model. */
  private unsafeRefusal(message: string): string | null {
    const q = message.toLowerCase();
    if (
      /password|otp|pin\b|credit card|cnic|bank account|private key/.test(q)
    ) {
      return "I keep chats study-safe. I never ask for or handle passwords, OTPs, CNIC, or payment details. Ask about your study plan instead.";
    }
    if (
      /how to (hack|make a bomb|kill)|suicide method|self[- ]harm instructions/.test(
        q
      )
    ) {
      return "I can only help with your Codes Thinker study plan. If you need real support, talk to a trusted person or local helpline. For learning, ask about your next course topic.";
    }
    return null;
  }

  async chat(
    userId: string,
    input: { message: string; courseId?: string }
  ) {
    const message = (input.message ?? "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .trim();
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

    const unsafe = this.unsafeRefusal(message);
    if (unsafe) {
      await this.prisma.aiMessage.create({
        data: {
          userId,
          role: "user",
          content: message,
          courseId: input.courseId || null,
        },
      });
      await this.prisma.aiMessage.create({
        data: {
          userId,
          role: "assistant",
          content: unsafe,
          courseId: input.courseId || null,
        },
      });
      return {
        reply: unsafe,
        mode: "safe-guard",
        remainingToday: Math.max(0, this.dailyLimit() - usedToday),
      };
    }
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
    const [user, enrollments, quizzes, certs, openTasks] = await Promise.all([
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
      this.prisma.task.findMany({
        where: {
          assigneeId: userId,
          status: { in: ["ASSIGNED", "IN_PROGRESS", "SUBMITTED", "BLOCKED"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          title: true,
          status: true,
          dueAt: true,
          course: { select: { title: true } },
        },
      }),
    ]);

    const courseIds = enrollments.map((e) => e.courseId);
    const [sections, progressRows] = await Promise.all([
      courseIds.length
        ? this.prisma.courseSection.findMany({
            where: { courseId: { in: courseIds } },
            orderBy: { sortOrder: "asc" },
            include: {
              topics: {
                orderBy: { sortOrder: "asc" },
                select: { id: true, title: true, minutes: true },
              },
            },
          })
        : Promise.resolve([]),
      this.prisma.topicProgress.findMany({
        where: { userId, completed: true },
        select: { topicId: true },
      }),
    ]);

    const completed = new Set(progressRows.map((p) => p.topicId));
    const sectionsByCourse = new Map<string, typeof sections>();
    for (const s of sections) {
      const list = sectionsByCourse.get(s.courseId) ?? [];
      list.push(s);
      sectionsByCourse.set(s.courseId, list);
    }

    const studyPlan = enrollments.map((e) => {
      const courseSections = sectionsByCourse.get(e.courseId) ?? [];
      const topics = courseSections.flatMap((s) =>
        s.topics.map((t) => ({
          id: t.id,
          title: t.title,
          minutes: t.minutes,
          section: s.title,
          done: completed.has(t.id),
        }))
      );
      const doneCount = topics.filter((t) => t.done).length;
      const nextTopics = topics
        .filter((t) => !t.done)
        .slice(0, 3)
        .map((t) => `${t.section}: ${t.title} (~${t.minutes}m)`);
      const percent =
        topics.length === 0
          ? 0
          : Math.round((doneCount / topics.length) * 100);
      return {
        id: e.course.id,
        title: e.course.title,
        category: e.course.category,
        progressPercent: percent,
        topicsDone: doneCount,
        topicsTotal: topics.length,
        nextTopics,
      };
    });

    const focusCourse = courseId
      ? enrollments.find((e) => e.courseId === courseId)?.course
      : null;
    const focusPlan = courseId
      ? studyPlan.find((c) => c.id === courseId) ?? null
      : studyPlan.find((c) => c.nextTopics.length > 0) ?? studyPlan[0] ?? null;

    return {
      name: user?.fullName ?? "Student",
      role: user?.accountType ?? "STUDENT",
      track: user?.track ?? null,
      courses: studyPlan,
      focusCourse: focusCourse
        ? { id: focusCourse.id, title: focusCourse.title }
        : focusPlan
          ? { id: focusPlan.id, title: focusPlan.title }
          : null,
      focusPlan,
      openTasks: openTasks.map((t) => ({
        title: t.title,
        status: t.status,
        course: t.course?.title ?? null,
        dueAt: t.dueAt?.toISOString().slice(0, 10) ?? null,
      })),
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

    const planLines = input.context.courses.map((c) => {
      const next =
        c.nextTopics.length > 0
          ? `next → ${c.nextTopics.join(" | ")}`
          : "all topics complete or no syllabus yet";
      return `• ${c.title} (${c.progressPercent}% — ${c.topicsDone}/${c.topicsTotal}): ${next}`;
    });

    const taskLines = input.context.openTasks.map(
      (t) =>
        `• ${t.title}${t.course ? ` [${t.course}]` : ""} — ${t.status}${
          t.dueAt ? `, due ${t.dueAt}` : ""
        }`
    );

    const system = [
      "You are the Codes Thinker LMS Study Coach — ONLY for this student's study plan.",
      "Scope (strict): enrolled courses, next topics, revision plans, quiz prep, certificates, and assigned tasks.",
      "Refuse anything outside studying on this LMS (news, politics, dating, random coding, jokes, medical/legal advice, etc.). Redirect politely to their next topic.",
      "Train them accurately: use the study plan data below. Prefer the focus course and unfinished next topics. Do not invent topics, grades, or fees.",
      "Guide step-by-step: what to study now, for how long, then what quiz/task to do. Keep answers short (bullets).",
      "Safety: never ask for passwords/OTP/CNIC/payment secrets. No harmful instructions. Stay kind and professional.",
      "App navigation tips when useful: Home (courses), Course topics (mark progress), Quizzes, Tasks, Certificates, Fees (fees only — redirect, do not process).",
      `Learner: ${input.context.name} (${input.context.role})`,
      input.context.track ? `Track: ${input.context.track}` : "",
      input.context.focusCourse
        ? `Focus course: ${input.context.focusCourse.title}`
        : "",
      input.context.focusPlan
        ? `Focus progress: ${input.context.focusPlan.progressPercent}% — next: ${
            input.context.focusPlan.nextTopics.join(" | ") || "none"
          }`
        : "",
      planLines.length
        ? `Study plan:\n${planLines.join("\n")}`
        : "Study plan: no enrollments yet — tell them to ask admin to enroll.",
      taskLines.length
        ? `Open tasks:\n${taskLines.join("\n")}`
        : "Open tasks: none",
      input.context.recentQuizAttempts.length
        ? `Recent quiz results: ${input.context.recentQuizAttempts
            .map(
              (a) =>
                `${a.quiz} ${a.percent}% (${a.passed ? "passed" : "not passed"})`
            )
            .join("; ")}`
        : "Recent quiz results: none yet",
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
        temperature: 0.35,
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

  /** Offline / no-key coach grounded in LMS study-plan data. */
  private localCoach(
    message: string,
    context: Awaited<ReturnType<AiService["buildLearnerContext"]>>
  ) {
    const q = message.toLowerCase();
    const focus = context.focusPlan;
    const courseList =
      context.courses
        .map(
          (c) =>
            `• ${c.title} — ${c.progressPercent}% (${c.topicsDone}/${c.topicsTotal})` +
            (c.nextTopics[0] ? `\n  Next: ${c.nextTopics[0]}` : "")
        )
        .join("\n") ||
      "• No enrollments yet. Ask admin to enroll you in a course.";

    const offTopic =
      /weather|cricket|bitcoin|crypto|dating|girlfriend|boyfriend|politics|election|movie|netflix|joke|meme/.test(
        q
      );
    if (offTopic) {
      return [
        `I only coach your Codes Thinker study plan, ${context.name}.`,
        focus?.nextTopics[0]
          ? `Right now, study: ${focus.nextTopics[0]} (${focus.title}).`
          : "Open Home → a course → continue the next unfinished topic.",
      ].join("\n");
    }

    if (/certificate|cert\b/.test(q)) {
      if (context.certificates.length) {
        return [
          `Hi ${context.name}, you already have:`,
          ...context.certificates.map(
            (c) =>
              `• ${c.title}${c.courseTitle ? ` (${c.courseTitle})` : ""}, code ${c.verificationCode}`
          ),
          "",
          "Pass a published course quiz to earn more. Path: Help → Quizzes.",
        ].join("\n");
      }
      return `Hi ${context.name}. No certificate yet. Finish topics, then Help → Quizzes → pass a published quiz.`;
    }

    if (/quiz|exam|test|mcq/.test(q)) {
      const recent = context.recentQuizAttempts[0];
      return [
        `Quiz prep for ${context.name}:`,
        focus?.nextTopics[0]
          ? `1. Revise first: ${focus.nextTopics[0]}`
          : "1. Revise your latest unfinished topic",
        "2. Open Help → Quizzes",
        "3. Take a published quiz for an enrolled course",
        recent
          ? `Latest result: ${recent.quiz} at ${recent.percent}% (${recent.passed ? "passed" : "not passed"}).`
          : "No attempts yet — one short practice pass helps a lot.",
      ].join("\n");
    }

    if (/task|assignment|homework/.test(q) && context.openTasks.length) {
      return [
        `Your open tasks:`,
        ...context.openTasks.map(
          (t) =>
            `• ${t.title}${t.course ? ` (${t.course})` : ""} — ${t.status}${
              t.dueAt ? `, due ${t.dueAt}` : ""
            }`
        ),
        "",
        "Path: Home / Tasks. Finish the oldest or nearest due first.",
      ].join("\n");
    }

    if (/plan|study|revise|revision|schedule|what should|next topic|guide/.test(q)) {
      return [
        `Study plan for ${context.name}:`,
        focus
          ? `Focus: ${focus.title} (${focus.progressPercent}%)`
          : "Pick an enrolled course on Home.",
        focus?.nextTopics.length
          ? `Today (45–60 min):\n${focus.nextTopics
              .map((t, i) => `${i + 1}. ${t}`)
              .join("\n")}`
          : "Today: open your course and mark the next topic complete.",
        "Then: write 5 flash questions → take a quiz if ready.",
        "",
        "Your courses:",
        courseList,
      ].join("\n");
    }

    if (/fee|payment|jazzcash|easypaisa/.test(q)) {
      return `For fees only: Help → Fees & payments. Upload a clear transfer screenshot. I cannot change fee status — stay on your study plan for learning help.`;
    }

    return [
      `Hi ${context.name}. I only guide your LMS study plan.`,
      focus?.nextTopics[0]
        ? `Start here: ${focus.nextTopics[0]} (${focus.title}).`
        : "Ask for a study plan, quiz prep, or your next topic.",
      "",
      "Your courses:",
      courseList,
    ].join("\n");
  }
}
