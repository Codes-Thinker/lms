import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type OutlineTopicInput = {
  id?: string;
  title: string;
  minutes?: number;
  order?: number;
};

type OutlineSectionInput = {
  id?: string;
  title: string;
  order?: number;
  topics?: OutlineTopicInput[];
};

type CourseWriteInput = {
  title?: string;
  category?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  durationMonths?: number;
  monthlyFee?: number;
  totalFee?: number;
  installmentFee?: number;
  installmentCount?: number;
  published?: boolean;
  batchLabel?: string | null;
  startMonth?: string | null;
  outline?: OutlineSectionInput[];
};

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

  private mapCourse(
    c: {
      id: string;
      title: string;
      category: string;
      description: string | null;
      thumbnailUrl: string | null;
      durationMonths: number;
      monthlyFee: number;
      totalFee: number;
      installmentFee: number;
      installmentCount: number;
      published: boolean;
      startMonth: string | null;
      rating: number;
      batchLabel: string | null;
      sections: {
        id: string;
        title: string;
        sortOrder: number;
        topics: {
          id: string;
          title: string;
          minutes: number;
          sortOrder: number;
        }[];
      }[];
      enrollments?: { paidAmount: number; feeStatus: string }[] | false;
      _count: { enrollments: number };
    },
    completedIds: Set<string>
  ) {
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
      installmentCount: c.installmentCount,
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
            minutes: t.minutes,
            order: t.sortOrder,
            completed: completedIds.has(t.id),
          })),
      })),
    };
  }

  async list(userId?: string, publishedOnly = true) {
    const courses = await this.prisma.course.findMany({
      where: publishedOnly ? { published: true } : undefined,
      include: {
        sections: {
          include: { topics: true },
          orderBy: { sortOrder: "asc" },
        },
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

    return courses.map((c) => this.mapCourse(c, completedIds));
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

  private async replaceOutline(courseId: string, outline: OutlineSectionInput[]) {
    const existing = await this.prisma.courseSection.findMany({
      where: { courseId },
      include: { topics: true },
    });
    const keepSectionIds = new Set(
      outline.map((s) => s.id).filter((id): id is string => Boolean(id))
    );
    const removeSections = existing.filter((s) => !keepSectionIds.has(s.id));
    if (removeSections.length) {
      await this.prisma.courseSection.deleteMany({
        where: { id: { in: removeSections.map((s) => s.id) } },
      });
    }

    for (let si = 0; si < outline.length; si++) {
      const section = outline[si];
      const title = (section.title || "").trim() || `Module ${si + 1}`;
      const topics = section.topics ?? [];
      let sectionId = section.id;

      if (sectionId && existing.some((s) => s.id === sectionId)) {
        await this.prisma.courseSection.update({
          where: { id: sectionId },
          data: { title, sortOrder: section.order ?? si },
        });
      } else {
        const created = await this.prisma.courseSection.create({
          data: {
            courseId,
            title,
            sortOrder: section.order ?? si,
          },
        });
        sectionId = created.id;
      }

      const existingSection = existing.find((s) => s.id === sectionId);
      const keepTopicIds = new Set(
        topics.map((t) => t.id).filter((id): id is string => Boolean(id))
      );
      if (existingSection) {
        const removeTopics = existingSection.topics.filter(
          (t) => !keepTopicIds.has(t.id)
        );
        if (removeTopics.length) {
          await this.prisma.courseTopic.deleteMany({
            where: { id: { in: removeTopics.map((t) => t.id) } },
          });
        }
      }

      for (let ti = 0; ti < topics.length; ti++) {
        const topic = topics[ti];
        const topicTitle = (topic.title || "").trim() || `Lecture ${ti + 1}`;
        const minutes = Math.max(5, Number(topic.minutes) || 45);
        if (topic.id && existingSection?.topics.some((t) => t.id === topic.id)) {
          await this.prisma.courseTopic.update({
            where: { id: topic.id },
            data: {
              title: topicTitle,
              minutes,
              sortOrder: topic.order ?? ti,
              sectionId,
            },
          });
        } else {
          await this.prisma.courseTopic.create({
            data: {
              sectionId: sectionId!,
              title: topicTitle,
              minutes,
              sortOrder: topic.order ?? ti,
            },
          });
        }
      }
    }
  }

  async create(data: CourseWriteInput) {
    const title = (data.title || "").trim();
    const category = (data.category || "").trim() || "General";
    if (!title) throw new BadRequestException("Title is required");

    const course = await this.prisma.course.create({
      data: {
        title,
        category,
        description: data.description ?? null,
        thumbnailUrl: data.thumbnailUrl ?? null,
        durationMonths: data.durationMonths ?? 3,
        monthlyFee: data.monthlyFee ?? 0,
        totalFee: data.totalFee ?? 0,
        installmentFee: data.installmentFee ?? 0,
        installmentCount: data.installmentCount ?? 2,
        published: data.published ?? false,
        batchLabel: data.batchLabel ?? null,
        startMonth: data.startMonth ?? null,
      },
    });

    if (data.outline?.length) {
      await this.replaceOutline(course.id, data.outline);
    }

    return this.get(course.id);
  }

  async update(id: string, data: CourseWriteInput) {
    await this.prisma.course.findUniqueOrThrow({ where: { id } });

    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title.trim();
    if (data.category !== undefined) patch.category = data.category.trim();
    if (data.description !== undefined) patch.description = data.description;
    if (data.thumbnailUrl !== undefined) patch.thumbnailUrl = data.thumbnailUrl;
    if (data.durationMonths !== undefined)
      patch.durationMonths = data.durationMonths;
    if (data.monthlyFee !== undefined) patch.monthlyFee = data.monthlyFee;
    if (data.totalFee !== undefined) patch.totalFee = data.totalFee;
    if (data.installmentFee !== undefined)
      patch.installmentFee = data.installmentFee;
    if (data.installmentCount !== undefined)
      patch.installmentCount = data.installmentCount;
    if (data.published !== undefined) patch.published = data.published;
    if (data.batchLabel !== undefined) patch.batchLabel = data.batchLabel;
    if (data.startMonth !== undefined) patch.startMonth = data.startMonth;

    if (Object.keys(patch).length) {
      await this.prisma.course.update({ where: { id }, data: patch });
    }

    if (data.outline) {
      await this.replaceOutline(id, data.outline);
    }

    return this.get(id);
  }

  async remove(id: string) {
    await this.prisma.course.findUniqueOrThrow({ where: { id } });
    // Clear optional FKs that are not cascading, then delete.
    await this.prisma.$transaction([
      this.prisma.attendanceRecord.updateMany({
        where: { courseId: id },
        data: { courseId: null },
      }),
      this.prisma.feeCase.updateMany({
        where: { courseId: id },
        data: { courseId: null },
      }),
      this.prisma.course.delete({ where: { id } }),
    ]);
    return { ok: true };
  }
}
