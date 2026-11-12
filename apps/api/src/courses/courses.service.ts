import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  private progressFor(
    topics: { id: string }[],
    completedIds: Set<string>
  ): { done: number; total: number; percent: number } {
    const total = topics.length;
    const done = topics.filter((t) => completedIds.has(t.id)).length;
    return {
      done,
      total,
      percent: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  }

  async list(userId?: string, publishedOnly = true) {
    const courses = await this.prisma.course.findMany({
      where: publishedOnly ? { published: true } : undefined,
      include: {
        sections: { include: { topics: true }, orderBy: { sortOrder: "asc" } },
        enrollments: userId ? { where: { userId } } : false,
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    let completedIds = new Set<string>();
    if (userId) {
      const progress = await this.prisma.topicProgress.findMany({
        where: { userId, completed: true },
        select: { topicId: true },
      });
      completedIds = new Set(progress.map((p) => p.topicId));
    }

    return courses.map((c) => {
      const topics = c.sections.flatMap((s) => s.topics);
      const enrollment = Array.isArray(c.enrollments) ? c.enrollments[0] : null;
      const progress = this.progressFor(topics, completedIds);
      return {
        id: c.id,
        title: c.title,
        category: c.category,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        durationMonths: c.durationMonths,
        monthlyFee: c.monthlyFee,
        totalFee: c.totalFee,
        installmentFee: c.installmentFee,
        published: c.published,
        startMonth: c.startMonth,
        rating: c.rating,
        batch: c.batchLabel,
        enrolledCount: c._count.enrollments,
        enrolled: Boolean(enrollment),
        paidAmount: enrollment?.paidAmount ?? 0,
        feeStatus: enrollment?.feeStatus ?? null,
        progressPercent: progress.percent,
        outline: c.sections.map((s) => ({
          id: s.id,
          title: s.title,
          order: s.sortOrder,
          topics: s.topics
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((t) => ({
              id: t.id,
              title: t.title,
              order: t.sortOrder,
              completed: completedIds.has(t.id),
            })),
        })),
      };
    });
  }

  async get(id: string, userId?: string) {
    const list = await this.list(userId, false);
    const course = list.find((c) => c.id === id);
    if (!course) throw new NotFoundException("Course not found");
    return course;
  }

  async enroll(userId: string, courseId: string) {
    await this.prisma.course.findUniqueOrThrow({ where: { id: courseId } });
    return this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {},
      create: { userId, courseId },
    });
  }

  async toggleTopic(userId: string, topicId: string, completed: boolean) {
    return this.prisma.topicProgress.upsert({
      where: { userId_topicId: { userId, topicId } },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId,
        topicId,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });
  }

  async create(data: {
    title: string;
    category: string;
    description?: string;
    durationMonths?: number;
    monthlyFee?: number;
    totalFee?: number;
    installmentFee?: number;
    published?: boolean;
    batchLabel?: string;
  }) {
    return this.prisma.course.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      category: string;
      description: string;
      published: boolean;
      monthlyFee: number;
      totalFee: number;
      installmentFee: number;
      batchLabel: string;
    }>
  ) {
    return this.prisma.course.update({ where: { id }, data });
  }
}
