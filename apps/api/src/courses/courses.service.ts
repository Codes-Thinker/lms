import {
  BadRequestException,
  ForbiddenException,
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
  allowEnrollmentRequests?: boolean;
  instructorId?: string | null;
  batchLabel?: string | null;
  startMonth?: string | null;
  outline?: OutlineSectionInput[];
};

export type EnrollmentStatusLabel =
  | "NOT_ENROLLED"
  | "REQUEST_PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ENROLLED";

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
      allowEnrollmentRequests?: boolean;
      instructorId?: string | null;
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
      enrollmentRequests?: { status: string }[] | false;
      instructor?: { id: string; fullName: string } | null;
      _count: { enrollments: number };
    },
    completedIds: Set<string>
  ) {
    const topics = c.sections.flatMap((s) => s.topics);
    const enrollment = Array.isArray(c.enrollments) ? c.enrollments[0] : null;
    const request = Array.isArray(c.enrollmentRequests)
      ? c.enrollmentRequests[0]
      : null;
    const progress = this.progressFor(topics, completedIds);
    const enrollmentStatus = this.resolveEnrollmentStatus(
      Boolean(enrollment),
      request?.status
    );
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
      allowEnrollmentRequests: Boolean(c.allowEnrollmentRequests),
      instructorId: c.instructorId ?? null,
      instructorName: c.instructor?.fullName ?? null,
      startMonth: c.startMonth,
      rating: c.rating,
      batch: c.batchLabel,
      enrolledCount: c._count.enrollments,
      enrolled: Boolean(enrollment),
      enrollmentStatus,
      requestStatus: request?.status ?? null,
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

  private resolveEnrollmentStatus(
    enrolled: boolean,
    requestStatus?: string | null
  ): EnrollmentStatusLabel {
    if (enrolled) return "ENROLLED";
    if (requestStatus === "PENDING") return "REQUEST_PENDING";
    if (requestStatus === "APPROVED") return "APPROVED";
    if (requestStatus === "REJECTED") return "REJECTED";
    return "NOT_ENROLLED";
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
        enrollmentRequests: userId ? { where: { userId } } : false,
        instructor: { select: { id: true, fullName: true } },
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

  /**
   * Student self-service: submit an enrollment REQUEST (never auto-enrolls).
   * Backend enforces allowEnrollmentRequests; direct Enrollment rows are
   * created only by admin approve or admin user courseIds sync.
   */
  async enroll(userId: string, courseId: string, note?: string) {
    return this.requestEnrollment(userId, courseId, note);
  }

  async requestEnrollment(userId: string, courseId: string, note?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course || !course.published) {
      throw new NotFoundException("Course not found");
    }

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existingEnrollment) {
      return {
        status: "ENROLLED" as EnrollmentStatusLabel,
        message: "Already enrolled in this course.",
        enrollment: existingEnrollment,
      };
    }

    if (!course.allowEnrollmentRequests) {
      throw new ForbiddenException(
        "Direct enrollment is unavailable for this course. Please contact the admin via chat to request enrollment."
      );
    }

    const existing = await this.prisma.enrollmentRequest.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing?.status === "PENDING") {
      return {
        status: "REQUEST_PENDING" as EnrollmentStatusLabel,
        message: "Your enrollment request is already pending admin review.",
        request: existing,
      };
    }

    const request = await this.prisma.enrollmentRequest.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {
        status: "PENDING",
        note: note?.trim() || null,
        adminNote: null,
        reviewedById: null,
        reviewedAt: null,
      },
      create: {
        userId,
        courseId,
        status: "PENDING",
        note: note?.trim() || null,
      },
    });

    return {
      status: "REQUEST_PENDING" as EnrollmentStatusLabel,
      message: "Enrollment request submitted. Waiting for admin approval.",
      request,
    };
  }

  async listEnrollmentRequests(courseId?: string, status?: string) {
    const where: Record<string, unknown> = {};
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;
    const rows = await this.prisma.enrollmentRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            track: true,
            accountType: true,
            status: true,
            batch: { select: { code: true, name: true } },
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            batchLabel: true,
            allowEnrollmentRequests: true,
          },
        },
        reviewedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      note: r.note,
      adminNote: r.adminNote,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      student: {
        id: r.user.id,
        name: r.user.fullName,
        email: r.user.email,
        phone: r.user.phone,
        track: r.user.track,
        accountType: r.user.accountType,
        accountStatus: r.user.status,
        batch: r.user.batch?.code ?? null,
      },
      course: r.course,
      reviewedBy: r.reviewedBy
        ? { id: r.reviewedBy.id, name: r.reviewedBy.fullName }
        : null,
    }));
  }

  async reviewEnrollmentRequest(
    requestId: string,
    reviewerId: string,
    action: "APPROVE" | "REJECT",
    adminNote?: string
  ) {
    const request = await this.prisma.enrollmentRequest.findUnique({
      where: { id: requestId },
      include: { course: true },
    });
    if (!request) throw new NotFoundException("Enrollment request not found");
    if (request.status !== "PENDING") {
      throw new BadRequestException(
        `Request is already ${request.status.toLowerCase()}`
      );
    }

    if (action === "REJECT") {
      const updated = await this.prisma.enrollmentRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          adminNote: adminNote?.trim() || null,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });
      return {
        status: "REJECTED" as EnrollmentStatusLabel,
        request: updated,
      };
    }

    const [enrollment, updated] = await this.prisma.$transaction([
      this.prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: request.userId,
            courseId: request.courseId,
          },
        },
        update: {},
        create: { userId: request.userId, courseId: request.courseId },
      }),
      this.prisma.enrollmentRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          adminNote: adminNote?.trim() || null,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      }),
    ]);

    return {
      status: "ENROLLED" as EnrollmentStatusLabel,
      enrollment,
      request: updated,
    };
  }

  async toggleTopic(userId: string, topicId: string, completed: boolean) {
    // Verify enrollment before allowing progress marking
    const topic = await this.prisma.courseTopic.findUnique({
      where: { id: topicId },
      include: { section: { select: { courseId: true } } },
    });
    if (!topic) throw new NotFoundException("Topic not found");

    const courseId = topic.section.courseId;
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    // SUPER_ADMIN and STAFF can mark progress on any course
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true },
    });
    const isStaff = user?.accountType === "SUPER_ADMIN" || user?.accountType === "STAFF";

    if (!enrollment && !isStaff) {
      throw new ForbiddenException(
        "You must be enrolled in this course to mark progress.",
      );
    }

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

  /** Dynamic course categories from the database. */
  async categories() {
    return this.prisma.courseCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  /**
   * Get course content with enrollment-based access control.
   * - Enrolled users (or staff) get the full outline with topics.
   * - Non-enrolled users get only public info (title, thumbnail, description,
   *   duration, fees, enrollment status) — NO outline/topics/lessons.
   */
  async getContent(id: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        sections: {
          include: { topics: true },
          orderBy: { sortOrder: "asc" },
        },
        enrollments: { where: { userId } },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) throw new NotFoundException("Course not found");
    if (!course.published) {
      // Only staff can see unpublished courses
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { accountType: true },
      });
      if (user?.accountType !== "SUPER_ADMIN" && user?.accountType !== "STAFF") {
        throw new NotFoundException("Course not found");
      }
    }

    const enrollment = course.enrollments[0] ?? null;
    const isEnrolled = Boolean(enrollment);

    const [user, request] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { accountType: true },
      }),
      this.prisma.enrollmentRequest.findUnique({
        where: { userId_courseId: { userId, courseId: id } },
      }),
    ]);
    const isStaff = user?.accountType === "SUPER_ADMIN" || user?.accountType === "STAFF";
    const enrollmentStatus = this.resolveEnrollmentStatus(
      isEnrolled,
      request?.status
    );

    // Public fields always returned
    const publicInfo = {
      id: course.id,
      title: course.title,
      category: course.category,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      durationMonths: course.durationMonths,
      monthlyFee: course.monthlyFee,
      totalFee: course.totalFee,
      installmentFee: course.installmentFee,
      installmentCount: course.installmentCount,
      published: course.published,
      allowEnrollmentRequests: course.allowEnrollmentRequests,
      startMonth: course.startMonth,
      rating: course.rating,
      batch: course.batchLabel,
      enrolledCount: course._count.enrollments,
      enrolled: isEnrolled,
      enrollmentStatus,
      requestStatus: request?.status ?? null,
      paidAmount: enrollment?.paidAmount ?? 0,
      feeStatus: enrollment?.feeStatus ?? null,
    };

    // Non-enrolled (non-staff) users get ONLY public info — no outline
    if (!isEnrolled && !isStaff) {
      const lockedMessage =
        enrollmentStatus === "REQUEST_PENDING"
          ? "Your enrollment request is pending admin approval."
          : enrollmentStatus === "REJECTED"
            ? "Your enrollment request was rejected. Contact admin via chat for help."
            : course.allowEnrollmentRequests
              ? "Request enrollment to access the full content. An admin must approve your request."
              : "Direct enrollment is unavailable. Contact the admin via chat to request enrollment.";
      return {
        ...publicInfo,
        progressPercent: 0,
        outline: [],
        locked: true,
        message: lockedMessage,
      };
    }

    // Enrolled or staff: return full content with progress
    const progress = await this.prisma.topicProgress.findMany({
      where: { userId, completed: true },
      select: { topicId: true },
    });
    const completedIds = new Set(progress.map((p) => p.topicId));

    const topics = course.sections.flatMap((s) => s.topics);
    const done = topics.filter((t) => completedIds.has(t.id)).length;
    const percent = topics.length === 0 ? 0 : Math.round((done / topics.length) * 100);

    return {
      ...publicInfo,
      progressPercent: percent,
      outline: course.sections.map((s) => ({
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
      locked: false,
    };
  }

  /** Check enrollment + request status for a user/course pair. */
  async checkEnrollment(userId: string, courseId: string) {
    const [enrollment, request, course] = await Promise.all([
      this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      }),
      this.prisma.enrollmentRequest.findUnique({
        where: { userId_courseId: { userId, courseId } },
      }),
      this.prisma.course.findUnique({
        where: { id: courseId },
        select: { allowEnrollmentRequests: true },
      }),
    ]);
    const enrolled = Boolean(enrollment);
    return {
      enrolled,
      enrollmentStatus: this.resolveEnrollmentStatus(enrolled, request?.status),
      allowEnrollmentRequests: Boolean(course?.allowEnrollmentRequests),
      request: request
        ? {
            id: request.id,
            status: request.status,
            note: request.note,
            adminNote: request.adminNote,
            createdAt: request.createdAt.toISOString(),
          }
        : null,
      enrollment,
    };
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

  /** Resolve admin category tab name → CourseCategory row (create if missing). */
  private async resolveCategory(name: string) {
    const trimmed = name.trim() || "General";
    const existing = await this.prisma.courseCategory.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
    });
    if (existing) {
      if (!existing.active) {
        await this.prisma.courseCategory.update({
          where: { id: existing.id },
          data: { active: true },
        });
      }
      return { id: existing.id, name: existing.name };
    }
    const created = await this.prisma.courseCategory.create({
      data: { name: trimmed, active: true, sortOrder: 99 },
    });
    return { id: created.id, name: created.name };
  }

  async create(data: CourseWriteInput) {
    const title = (data.title || "").trim();
    if (!title) throw new BadRequestException("Title is required");
    const cat = await this.resolveCategory(data.category || "General");

    const course = await this.prisma.course.create({
      data: {
        title,
        category: cat.name,
        categoryId: cat.id,
        description: data.description ?? null,
        thumbnailUrl: data.thumbnailUrl ?? null,
        durationMonths: data.durationMonths ?? 3,
        monthlyFee: data.monthlyFee ?? 0,
        totalFee: data.totalFee ?? 0,
        installmentFee: data.installmentFee ?? 0,
        installmentCount: data.installmentCount ?? 2,
        published: data.published ?? false,
        allowEnrollmentRequests: data.allowEnrollmentRequests ?? false,
        instructorId: data.instructorId ?? null,
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
    if (data.category !== undefined) {
      const cat = await this.resolveCategory(data.category);
      patch.category = cat.name;
      patch.categoryId = cat.id;
    }
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
    if (data.allowEnrollmentRequests !== undefined) {
      patch.allowEnrollmentRequests = data.allowEnrollmentRequests;
    }
    if (data.instructorId !== undefined) patch.instructorId = data.instructorId;
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
