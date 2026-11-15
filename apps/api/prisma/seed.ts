import {
  AccountStatus,
  AccountType,
  AttendanceStatus,
  FeeStatus,
  PrismaClient,
  TaskStatus,
  TicketKind,
  TicketStatus,
  ChatKind,
  NotificationType,
} from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "codesthinker";

const ROLES = [
  { code: "SUPER_ADMIN", name: "Super Admin", description: "Full platform access" },
  { code: "STAFF", name: "Staff", description: "Staff / teacher access" },
  { code: "STUDENT", name: "Student", description: "Student learner" },
  { code: "INTERN", name: "Intern", description: "Intern learner" },
] as const;

async function upsertUser(opts: {
  email: string;
  fullName: string;
  accountType: AccountType;
  passwordHash: string;
  designation?: string;
  phone?: string;
  track?: string;
  departmentId?: string;
  batchId?: string;
  roleId: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: opts.email },
    update: {
      fullName: opts.fullName,
      passwordHash: opts.passwordHash,
      accountType: opts.accountType,
      status: AccountStatus.ACTIVE,
      designation: opts.designation,
      phone: opts.phone,
      track: opts.track,
      departmentId: opts.departmentId,
      batchId: opts.batchId,
      activatedAt: new Date(),
    },
    create: {
      fullName: opts.fullName,
      email: opts.email,
      passwordHash: opts.passwordHash,
      accountType: opts.accountType,
      status: AccountStatus.ACTIVE,
      designation: opts.designation,
      phone: opts.phone,
      track: opts.track,
      departmentId: opts.departmentId,
      batchId: opts.batchId,
      activatedAt: new Date(),
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: opts.roleId } },
    update: {},
    create: { userId: user.id, roleId: opts.roleId },
  });
  return user;
}

async function main() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: { ...role },
    });
  }

  const roleByCode = Object.fromEntries(
    (await prisma.role.findMany()).map((r) => [r.code, r.id])
  );

  const depts = [
    "Management",
    "Training Faculty",
    "HR / Ops",
    "Mobile Interns",
    "Backend Interns",
    "Paid Training",
    "Development",
    "Design",
    "Marketing",
    "HR",
  ];
  for (const name of depts) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  const dept = Object.fromEntries(
    (await prisma.department.findMany()).map((d) => [d.name, d.id])
  );

  const batches = [
    { code: "CT-STU-FLUTTER", name: "Flutter Students" },
    { code: "CT-STU-MERN", name: "MERN Students" },
    { code: "CT-STU-NEXT", name: "Next.js Students" },
    { code: "CT-INTERN-A", name: "Flutter Interns A" },
    { code: "CT-INTERN-B", name: "MERN Interns B" },
    { code: "CT-FLUTTER-NOV-26", name: "Flutter Nov 26" },
    { code: "CT-MERN-OCT-26", name: "MERN Oct 26" },
    { code: "CT-NEXT-NOV-26", name: "Next Nov 26" },
  ];
  for (const b of batches) {
    await prisma.batch.upsert({
      where: { code: b.code },
      update: { name: b.name },
      create: {
        code: b.code,
        name: b.name,
        departmentId: dept["Paid Training"],
      },
    });
  }
  const batch = Object.fromEntries(
    (await prisma.batch.findMany()).map((b) => [b.code, b.id])
  );

  const hash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });
  const adminHash = await argon2.hash(
    process.env.SEED_ADMIN_PASSWORD ?? "Admin@CodesThinker1",
    { type: argon2.argon2id }
  );

  const admin = await upsertUser({
    email: process.env.SEED_ADMIN_EMAIL ?? "ayaz@codesthinker.com",
    fullName: process.env.SEED_ADMIN_NAME ?? "Ayaz Aslam",
    accountType: AccountType.SUPER_ADMIN,
    passwordHash: adminHash,
    designation: "CEO",
    phone: "+92 300 0000001",
    track: "Management",
    departmentId: dept["Management"],
    roleId: roleByCode.SUPER_ADMIN,
  });

  const hassan = await upsertUser({
    email: "hassan@codesthinker.com",
    fullName: "Hassan Raza",
    accountType: AccountType.STAFF,
    passwordHash: hash,
    designation: "Flutter Mentor",
    phone: "+92 300 1111001",
    track: "Flutter Mentor",
    departmentId: dept["Training Faculty"],
    roleId: roleByCode.STAFF,
  });

  await upsertUser({
    email: "sana@codesthinker.com",
    fullName: "Sana Malik",
    accountType: AccountType.STAFF,
    passwordHash: hash,
    designation: "Operations",
    phone: "+92 300 1111002",
    track: "Operations",
    departmentId: dept["HR / Ops"],
    roleId: roleByCode.STAFF,
  });

  const usman = await upsertUser({
    email: "usman@codesthinker.com",
    fullName: "Usman Tariq",
    accountType: AccountType.INTERN,
    passwordHash: hash,
    phone: "+92 301 2222001",
    track: "Flutter Internship",
    departmentId: dept["Mobile Interns"],
    batchId: batch["CT-INTERN-A"],
    roleId: roleByCode.INTERN,
  });

  const ayesha = await upsertUser({
    email: "ayesha@codesthinker.com",
    fullName: "Ayesha Siddiqui",
    accountType: AccountType.INTERN,
    passwordHash: hash,
    phone: "+92 301 2222002",
    track: "MERN Internship",
    departmentId: dept["Backend Interns"],
    batchId: batch["CT-INTERN-B"],
    roleId: roleByCode.INTERN,
  });

  const ali = await upsertUser({
    email: "ali@codesthinker.com",
    fullName: "Ali Khan",
    accountType: AccountType.STUDENT,
    passwordHash: hash,
    phone: "+92 302 3333001",
    track: "Flutter Development",
    departmentId: dept["Paid Training"],
    batchId: batch["CT-STU-FLUTTER"],
    roleId: roleByCode.STUDENT,
  });

  const fatima = await upsertUser({
    email: "fatima@codesthinker.com",
    fullName: "Fatima Noor",
    accountType: AccountType.STUDENT,
    passwordHash: hash,
    phone: "+92 302 3333002",
    track: "MERN Stack",
    departmentId: dept["Paid Training"],
    batchId: batch["CT-STU-MERN"],
    roleId: roleByCode.STUDENT,
  });

  const bilal = await upsertUser({
    email: "bilal@codesthinker.com",
    fullName: "Bilal Ahmed",
    accountType: AccountType.STUDENT,
    passwordHash: hash,
    phone: "+92 302 3333003",
    track: "Next.js Frontend",
    departmentId: dept["Paid Training"],
    batchId: batch["CT-STU-NEXT"],
    roleId: roleByCode.STUDENT,
  });

  // Clear domain data for idempotent reseed of LMS content
  await prisma.topicProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.courseTopic.deleteMany();
  await prisma.courseSection.deleteMany();
  await prisma.feeMessage.deleteMany();
  await prisma.feeCase.deleteMany();
  await prisma.taskMessage.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatThread.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.surveyResponse.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.appNotification.deleteMany();
  await prisma.course.deleteMany();

  const flutter = await prisma.course.create({
    data: {
      title: "Flutter Development Internship",
      category: "Flutter",
      description: "Full Flutter track with Provider and clean architecture.",
      thumbnailUrl: "https://picsum.photos/seed/flutter-ui/800/500",
      durationMonths: 4,
      monthlyFee: 12000,
      totalFee: 48000,
      installmentFee: 6000,
      published: true,
      startMonth: "2026-08",
      rating: 4.8,
      batchId: batch["CT-FLUTTER-NOV-26"],
      batchLabel: "CT-FLUTTER-NOV-26",
      sections: {
        create: [
          {
            title: "Month 1 — Foundations",
            sortOrder: 1,
            topics: {
              create: [
                { title: "Dart & project setup", sortOrder: 1 },
                { title: "Widgets & layout", sortOrder: 2 },
                { title: "Clean Architecture intro", sortOrder: 3 },
                { title: "API integration basics", sortOrder: 4 },
              ],
            },
          },
          {
            title: "Month 2 — State Management",
            sortOrder: 2,
            topics: {
              create: [
                { title: "Provider ChangeNotifier", sortOrder: 1 },
                { title: "MultiProvider", sortOrder: 2 },
                { title: "Consumer vs Selector", sortOrder: 3 },
                { title: "Auth & progress state", sortOrder: 4 },
              ],
            },
          },
          {
            title: "Month 3 — Features",
            sortOrder: 3,
            topics: {
              create: [
                { title: "Navigation & deep links", sortOrder: 1 },
                { title: "Forms & validation", sortOrder: 2 },
              ],
            },
          },
        ],
      },
    },
    include: { sections: { include: { topics: true } } },
  });

  const mern = await prisma.course.create({
    data: {
      title: "MERN Stack Development",
      category: "Node.js",
      description: "Mongo, Express, React, Node professional track.",
      thumbnailUrl: "https://picsum.photos/seed/mern-ui/800/500",
      durationMonths: 3,
      monthlyFee: 15000,
      totalFee: 45000,
      installmentFee: 7500,
      published: true,
      startMonth: "2026-09",
      rating: 4.6,
      batchId: batch["CT-MERN-OCT-26"],
      batchLabel: "CT-MERN-OCT-26",
      sections: {
        create: [
          {
            title: "Month 1 — Node & Express",
            sortOrder: 1,
            topics: {
              create: [
                { title: "Express REST APIs", sortOrder: 1 },
                { title: "MongoDB models", sortOrder: 2 },
                { title: "Auth JWT", sortOrder: 3 },
              ],
            },
          },
        ],
      },
    },
    include: { sections: { include: { topics: true } } },
  });

  const nextCourse = await prisma.course.create({
    data: {
      title: "Frontend Engineering with Next.js",
      category: "Design",
      description: "Next.js frontend engineering",
      thumbnailUrl: "https://picsum.photos/seed/next-ui/800/500",
      durationMonths: 3,
      monthlyFee: 10000,
      totalFee: 30000,
      installmentFee: 5000,
      published: true,
      startMonth: "2026-09",
      rating: 4.5,
      batchId: batch["CT-NEXT-NOV-26"],
      batchLabel: "CT-NEXT-NOV-26",
      sections: {
        create: [
          {
            title: "Month 1 — App Router",
            sortOrder: 1,
            topics: {
              create: [
                { title: "Routing & layouts", sortOrder: 1 },
                { title: "Server vs client components", sortOrder: 2 },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.enrollment.createMany({
    data: [
      {
        userId: ali.id,
        courseId: flutter.id,
        paidAmount: 24000,
        feeStatus: FeeStatus.PARTIAL,
      },
      {
        userId: ali.id,
        courseId: mern.id,
        paidAmount: 15000,
        feeStatus: FeeStatus.DUE,
      },
      {
        userId: usman.id,
        courseId: flutter.id,
        paidAmount: 0,
        feeStatus: FeeStatus.DUE,
      },
      {
        userId: fatima.id,
        courseId: mern.id,
        paidAmount: 45000,
        feeStatus: FeeStatus.PAID,
      },
      {
        userId: bilal.id,
        courseId: nextCourse.id,
        paidAmount: 0,
        feeStatus: FeeStatus.DUE,
      },
    ],
  });

  const flutterTopics = flutter.sections.flatMap((s) => s.topics);
  for (const t of flutterTopics.slice(0, 6)) {
    await prisma.topicProgress.create({
      data: {
        userId: ali.id,
        topicId: t.id,
        completed: true,
        completedAt: new Date(),
      },
    });
  }
  const mernTopics = mern.sections.flatMap((s) => s.topics);
  if (mernTopics[0]) {
    await prisma.topicProgress.create({
      data: {
        userId: ali.id,
        topicId: mernTopics[0].id,
        completed: true,
        completedAt: new Date(),
      },
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };

  await prisma.attendanceRecord.createMany({
    data: [
      {
        userId: ali.id,
        courseId: flutter.id,
        date: today,
        checkInAt: new Date(today.getTime() + 9 * 3600_000 + 58 * 60_000),
        checkOutAt: new Date(today.getTime() + 14 * 3600_000 + 10 * 60_000),
        status: AttendanceStatus.CHECKED_OUT,
      },
      {
        userId: usman.id,
        courseId: flutter.id,
        date: today,
        checkInAt: new Date(today.getTime() + 10 * 3600_000 + 1 * 60_000),
        status: AttendanceStatus.PRESENT,
      },
      {
        userId: hassan.id,
        date: today,
        checkInAt: new Date(today.getTime() + 9 * 3600_000 + 45 * 60_000),
        status: AttendanceStatus.PRESENT,
      },
      {
        userId: fatima.id,
        courseId: mern.id,
        date: today,
        checkInAt: new Date(today.getTime() + 10 * 3600_000 + 12 * 60_000),
        status: AttendanceStatus.LATE,
      },
      {
        userId: ali.id,
        courseId: flutter.id,
        date: daysAgo(1),
        checkInAt: new Date(daysAgo(1).getTime() + 10 * 3600_000),
        status: AttendanceStatus.PRESENT,
      },
      {
        userId: ali.id,
        courseId: mern.id,
        date: daysAgo(2),
        checkInAt: new Date(daysAgo(2).getTime() + 14 * 3600_000),
        status: AttendanceStatus.LATE,
      },
      {
        userId: ali.id,
        courseId: mern.id,
        date: daysAgo(3),
        status: AttendanceStatus.ABSENT,
      },
      {
        userId: ali.id,
        courseId: flutter.id,
        date: daysAgo(4),
        checkInAt: new Date(daysAgo(4).getTime() + 10 * 3600_000),
        status: AttendanceStatus.PRESENT,
      },
    ],
  });

  const fee1 = await prisma.feeCase.create({
    data: {
      studentId: ali.id,
      courseId: flutter.id,
      courseTitle: "Flutter Development",
      month: "Nov 2026",
      amount: 12000,
      status: FeeStatus.SENT,
      dueDate: new Date("2026-11-15"),
      messages: {
        create: [
          {
            senderId: admin.id,
            senderName: "Ayaz Aslam",
            senderRole: "ADMIN",
            text: "JazzCash 0300-0000001 pe transfer karke screenshot bhejo.",
          },
          {
            senderId: ali.id,
            senderName: "Ali Khan",
            senderRole: "STUDENT",
            text: "Payment screenshot attached. Please approve.",
            hasScreenshot: true,
          },
        ],
      },
    },
  });

  await prisma.feeCase.create({
    data: {
      studentId: fatima.id,
      courseId: mern.id,
      courseTitle: "MERN Stack",
      month: "Nov 2026",
      amount: 15000,
      status: FeeStatus.PAID,
      dueDate: new Date("2026-11-05"),
      messages: {
        create: [
          {
            senderId: admin.id,
            senderName: "Ayaz Aslam",
            senderRole: "ADMIN",
            text: "Payment verified. Fee marked PAID.",
          },
        ],
      },
    },
  });

  await prisma.feeCase.create({
    data: {
      studentId: bilal.id,
      courseId: nextCourse.id,
      courseTitle: "Next.js Frontend",
      month: "Nov 2026",
      amount: 10000,
      status: FeeStatus.DUE,
      dueDate: new Date("2026-11-12"),
      messages: {
        create: [
          {
            senderId: admin.id,
            senderName: "Ayaz Aslam",
            senderRole: "ADMIN",
            text: "Fee due Rs 10,000. Online number: 0300-0000001",
          },
        ],
      },
    },
  });

  await prisma.task.create({
    data: {
      title: "Prepare Flutter batch attendance sheet",
      description: "Verify today's app attendance sync and mark anomalies.",
      studyNotes: "Check late marks after 10:05 AM.",
      audience: AccountType.STAFF,
      status: TaskStatus.IN_PROGRESS,
      dueAt: new Date(today.getTime() + 18 * 3600_000),
      timerMinutes: 40,
      spentMinutes: 12,
      assigneeId: hassan.id,
      createdById: admin.id,
      messages: {
        create: [
          {
            senderId: admin.id,
            senderName: "Ayaz Aslam",
            senderRole: "ADMIN",
            text: "Ali Khan late mark confirm karo.",
          },
        ],
      },
    },
  });

  await prisma.project.createMany({
    data: [
      {
        title: "Code's Thinker LMS Student App polish",
        description: "Attendance real-time clock + role dashboards polish.",
        internId: usman.id,
        createdById: admin.id,
        status: TaskStatus.IN_PROGRESS,
        deadline: new Date("2026-11-20"),
        techStack: "Flutter + Provider",
        repoUrl: "https://github.com/codesthinker/lms-mobile",
        progressPercent: 55,
      },
      {
        title: "Intern portal API contracts",
        description: "Draft NestJS DTOs for projects module.",
        internId: ayesha.id,
        createdById: admin.id,
        status: TaskStatus.ASSIGNED,
        deadline: new Date("2026-11-18"),
        techStack: "NestJS + Prisma",
        progressPercent: 10,
      },
    ],
  });

  await prisma.supportTicket.createMany({
    data: [
      {
        kind: TicketKind.REPORT,
        userId: ali.id,
        title: "Class timing clash",
        body: "Friday 2pm slot overlaps with my college.",
        status: TicketStatus.OPEN,
      },
      {
        kind: TicketKind.COMPLAIN,
        userId: usman.id,
        title: "AC not working in lab",
        body: "Lab 2 AC is off since Monday.",
        status: TicketStatus.OPEN,
      },
    ],
  });

  const survey = await prisma.survey.create({
    data: {
      title: "November training feedback",
      description: "2-minute survey about your batch experience",
      active: true,
      questions: [
        { id: "q1", text: "How clear are the classes?" },
        { id: "q2", text: "What should we improve?" },
        { id: "q3", text: "Would you recommend Code's Thinker?" },
      ],
    },
  });

  await prisma.surveyResponse.create({
    data: {
      surveyId: survey.id,
      userId: fatima.id,
      answers: {
        q1: "Very clear",
        q2: "More practice tasks",
        q3: "Yes",
      },
    },
  });

  await prisma.chatThread.create({
    data: {
      kind: ChatKind.ADMIN,
      userId: ali.id,
      lastMessage: "Sir fee screenshot bhej diya hai",
      unreadByAdmin: 1,
      messages: {
        create: [
          {
            senderId: ali.id,
            senderName: "Ali Khan",
            senderRole: "USER",
            text: "Assalam o Alaikum sir",
          },
          {
            senderId: admin.id,
            senderName: "Ayaz Aslam",
            senderRole: "ADMIN",
            text: "Walaikum Assalam. Bataiye.",
          },
          {
            senderId: ali.id,
            senderName: "Ali Khan",
            senderRole: "USER",
            text: "Sir fee screenshot bhej diya hai",
          },
        ],
      },
    },
  });

  await prisma.chatThread.create({
    data: {
      kind: ChatKind.ADMIN,
      userId: hassan.id,
      lastMessage: "Batch attendance sheet ready",
      unreadByAdmin: 0,
      messages: {
        create: [
          {
            senderId: hassan.id,
            senderName: "Hassan Raza",
            senderRole: "USER",
            text: "Batch attendance sheet ready",
          },
        ],
      },
    },
  });

  await prisma.appNotification.createMany({
    data: [
      {
        userId: admin.id,
        title: "Attendance update",
        body: "A check-in was recorded from the app",
        type: NotificationType.ATTENDANCE,
        read: false,
      },
      {
        userId: admin.id,
        title: "Late attendance",
        body: "A late check-in was recorded",
        type: NotificationType.ATTENDANCE,
        read: false,
      },
      {
        userId: ali.id,
        title: "Fee reminder",
        body: "Your November fee is due soon",
        type: NotificationType.FEE,
        read: false,
      },
      {
        userId: hassan.id,
        title: "New task",
        body: "Prepare Flutter batch attendance sheet",
        type: NotificationType.TASK,
        read: false,
      },
    ],
  });

  await prisma.appVersion.upsert({
    where: { id: 1 },
    update: {
      minVersion: "1.0.0",
      latestVersion: "1.0.0",
      forceUpdate: false,
      message: "You're up to date",
    },
    create: {
      id: 1,
      minVersion: "1.0.0",
      latestVersion: "1.0.0",
      forceUpdate: false,
      message: "You're up to date",
    },
  });

  await prisma.paymentInfo.upsert({
    where: { id: 1 },
    update: {
      adminName: "Ayaz Aslam",
      phone: "+92 300 0000001",
      jazzCash: "0300-0000001",
      easyPaisa: "0300-0000001",
      bankTitle: "Code's Thinker",
      bankAccount: "PK00 CTBK 0000 0000 0001",
    },
    create: {
      id: 1,
      adminName: "Ayaz Aslam",
      phone: "+92 300 0000001",
      jazzCash: "0300-0000001",
      easyPaisa: "0300-0000001",
      bankTitle: "Code's Thinker",
      bankAccount: "PK00 CTBK 0000 0000 0001",
    },
  });

  // ── Office geofence (Port Singer) + role shift defaults ──
  await prisma.officeConfig.upsert({
    where: { id: 1 },
    update: {
      radiusMeters: 50,
      studentStartTime: "09:00",
      studentEndTime: "14:00",
      staffStartTime: "08:00",
      staffEndTime: "17:00",
      internStartTime: "10:00",
      internEndTime: "18:00",
    },
    create: {
      id: 1,
      latitude: 29.3931779,
      longitude: 71.6924333,
      radiusMeters: 50,
      timezone: "Asia/Karachi",
      studentStartTime: "09:00",
      studentEndTime: "14:00",
      staffStartTime: "08:00",
      staffEndTime: "17:00",
      internStartTime: "10:00",
      internEndTime: "18:00",
    },
  });

  // ── Dynamic course categories ──
  const categoryNames = [
    { name: "Programming", icon: "code", sortOrder: 1 },
    { name: "Flutter Development", icon: "phone_android", sortOrder: 2 },
    { name: "Web Development", icon: "web", sortOrder: 3 },
    { name: "UI/UX Design", icon: "design_services", sortOrder: 4 },
    { name: "Graphic Design", icon: "brush", sortOrder: 5 },
    { name: "Backend Development", icon: "dns", sortOrder: 6 },
  ];
  for (const cat of categoryNames) {
    await prisma.courseCategory.upsert({
      where: { name: cat.name },
      update: { icon: cat.icon, sortOrder: cat.sortOrder },
      create: cat,
    });
  }

  // Link existing courses to categories by matching category string
  const allCourses = await prisma.course.findMany();
  const allCategories = await prisma.courseCategory.findMany();
  for (const course of allCourses) {
    const matched = allCategories.find(
      (c) => c.name.toLowerCase() === course.category.toLowerCase()
    );
    if (matched && !course.categoryId) {
      await prisma.course.update({
        where: { id: course.id },
        data: { categoryId: matched.id },
      });
    }
  }

  // ── Staff work schedules ──
  const staffUsers = await prisma.user.findMany({
    where: { accountType: AccountType.STAFF },
  });
  for (const staff of staffUsers) {
    await prisma.staffSchedule.upsert({
      where: { userId: staff.id },
      update: {},
      create: { userId: staff.id, startTime: "08:00", endTime: "17:00" },
    });
  }

  console.log("Seed complete:", {
    admin: admin.email,
    demoPassword: DEMO_PASSWORD,
    feeCase: fee1.id,
    courses: [flutter.title, mern.title, nextCourse.title],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
