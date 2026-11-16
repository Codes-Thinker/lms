import { Injectable, NotFoundException } from "@nestjs/common";
import { AttendanceStatus, FeeStatus } from "@prisma/client";
import { CoursesService } from "../courses/courses.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courses: CoursesService
  ) {}

  async overview() {
    const [students, interns, staff, fees, tasks, projects, todayAttendance] =
      await Promise.all([
        this.prisma.user.count({ where: { accountType: "STUDENT" } }),
        this.prisma.user.count({ where: { accountType: "INTERN" } }),
        this.prisma.user.count({ where: { accountType: "STAFF" } }),
        this.prisma.feeCase.findMany({
          where: { status: { not: FeeStatus.PAID } },
        }),
        this.prisma.task.count({ where: { status: { not: "DONE" } } }),
        this.prisma.project.count({ where: { status: { not: "DONE" } } }),
        this.prisma.attendanceRecord.findMany({
          where: {
            date: (() => {
              const d = new Date();
              d.setHours(0, 0, 0, 0);
              return d;
            })(),
          },
        }),
      ]);

    const presentish = todayAttendance.filter(
      (a) =>
        a.status === AttendanceStatus.PRESENT ||
        a.status === AttendanceStatus.LATE ||
        a.status === AttendanceStatus.CHECKED_OUT
    ).length;
    const attendanceTodayPercent =
      todayAttendance.length === 0
        ? 0
        : Math.round((presentish / todayAttendance.length) * 100);

    return {
      students,
      interns,
      staff,
      attendanceTodayPercent,
      feesPending: fees.reduce((s, f) => s + f.amount, 0),
      openStaffTasks: tasks,
      openInternProjects: projects,
      attendanceTodayCount: todayAttendance.length,
    };
  }

  async forUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { department: true, batch: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const [attendance, fees] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 90,
        include: { course: true },
      }),
      this.prisma.feeCase.findMany({
        where: { studentId: userId },
        orderBy: { dueDate: "desc" },
      }),
    ]);

    let courseList: Awaited<ReturnType<CoursesService["list"]>> = [];
    try {
      // Include drafts so admin profile still shows enrollments.
      courseList = await this.courses.list(userId, false);
    } catch {
      courseList = [];
    }

    const enrolled = courseList.filter((c) => c.enrolled);
    const present = attendance.filter(
      (a) =>
        a.status === AttendanceStatus.PRESENT ||
        a.status === AttendanceStatus.LATE ||
        a.status === AttendanceStatus.CHECKED_OUT
    ).length;
    const attendancePercent =
      attendance.length === 0
        ? 0
        : Math.round((present / attendance.length) * 100);

    const feesPending = fees
      .filter((f) => f.status !== FeeStatus.PAID)
      .reduce((s, f) => s + f.amount, 0);

    const [tasks, projects, taughtCourses] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          OR: [{ assigneeId: userId }, { createdById: userId }],
        },
        include: {
          createdBy: { select: { fullName: true } },
          assignee: { select: { fullName: true } },
          course: { select: { title: true, batchLabel: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      this.prisma.project.findMany({
        where: { internId: userId },
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.course.findMany({
        where: { instructorId: userId },
        select: {
          id: true,
          title: true,
          batchLabel: true,
          _count: { select: { enrollments: true } },
        },
      }),
    ]);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        accountType: user.accountType,
        status: user.status,
        track: user.track,
        designation: user.designation,
        department: user.department?.name ?? null,
        batch: user.batch?.code ?? null,
        phone: user.phone,
        profileImage: user.profileImage,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        internshipStart: user.internshipStart?.toISOString().slice(0, 10) ?? null,
        internshipEnd: user.internshipEnd?.toISOString().slice(0, 10) ?? null,
      },
      attendancePercent,
      feesPending,
      feesPaid: fees
        .filter((f) => f.status === FeeStatus.PAID)
        .reduce((s, f) => s + f.amount, 0),
      courses: enrolled.map((c) => ({
        id: c.id,
        title: c.title,
        batch: c.batch,
        progressPercent: c.progressPercent,
        feeStatus: c.feeStatus,
        paidAmount: c.paidAmount,
        totalFee: c.totalFee,
        outline: c.outline,
      })),
      recentAttendance: attendance.slice(0, 14).map((a) => ({
        date: a.date.toISOString().slice(0, 10),
        status: a.status,
        courseTitle: a.course?.title ?? null,
        checkInAt: a.checkInAt?.toISOString() ?? null,
      })),
      fees: fees.map((f) => ({
        id: f.id,
        courseTitle: f.courseTitle,
        month: f.month,
        amount: f.amount,
        status: f.status,
        dueDate: f.dueDate.toISOString().slice(0, 10),
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        audience: t.audience,
        dueAt: t.dueAt?.toISOString() ?? null,
        assignedBy: t.createdBy?.fullName ?? null,
        assignedToName: t.assignee?.fullName ?? null,
        courseTitle: t.course?.title ?? null,
        batch: t.course?.batchLabel ?? null,
        source: t.createdBy?.fullName
          ? `Assigned by ${t.createdBy.fullName}`
          : "Task module (admin/teacher)",
      })),
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        techStack: p.techStack,
        status: p.status,
        progressPercent: p.progressPercent,
        deadline: p.deadline?.toISOString().slice(0, 10) ?? null,
      })),
      taughtCourses: taughtCourses.map((c) => ({
        id: c.id,
        title: c.title,
        batch: c.batchLabel,
        enrolledCount: c._count.enrollments,
      })),
    };
  }
}
