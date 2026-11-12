import type {
  AdminChatThread,
  AdminPaymentInfo,
  AppNotification,
  AssignedTask,
  AttendanceRecord,
  Course,
  DashboardMetrics,
  FeeRecord,
  FeedbackItem,
  InternProject,
  Person,
  SurveyDefinition,
  SurveyResponse,
} from "@/types";

export let adminPaymentInfo: AdminPaymentInfo = {
  adminName: "Ayaz Aslam",
  phone: "+92 300 0000001",
  jazzCash: "0300-0000001",
  easyPaisa: "0300-0000001",
  bankTitle: "Code's Thinker",
  bankAccount: "PK00 CTBK 0000 0000 0001",
};

export const adminUser: Person = {
  id: "u-admin-1",
  name: "Ayaz Aslam",
  email: "ayaz@codesthinker.com",
  role: "SUPER_ADMIN",
  department: "Management",
  phone: "+92 300 0000001",
  joinDate: "2024-01-01",
  attendancePercent: 100,
};

export const people: Person[] = [
  adminUser,
  {
    id: "u-staff-1",
    name: "Hassan Raza",
    email: "hassan@codesthinker.com",
    role: "STAFF",
    department: "Training Faculty",
    phone: "+92 300 1111001",
    joinDate: "2025-03-01",
    track: "Flutter Mentor",
    attendancePercent: 96,
  },
  {
    id: "u-staff-2",
    name: "Sana Malik",
    email: "sana@codesthinker.com",
    role: "STAFF",
    department: "HR / Ops",
    phone: "+92 300 1111002",
    joinDate: "2025-06-01",
    track: "Operations",
    attendancePercent: 92,
  },
  {
    id: "u-intern-1",
    name: "Usman Tariq",
    email: "usman@codesthinker.com",
    role: "INTERN",
    department: "Mobile Interns",
    phone: "+92 301 2222001",
    joinDate: "2026-08-01",
    track: "Flutter Internship",
    batch: "CT-INTERN-A",
    attendancePercent: 90,
  },
  {
    id: "u-intern-2",
    name: "Ayesha Siddiqui",
    email: "ayesha@codesthinker.com",
    role: "INTERN",
    department: "Backend Interns",
    phone: "+92 301 2222002",
    joinDate: "2026-09-01",
    track: "MERN Internship",
    batch: "CT-INTERN-B",
    attendancePercent: 94,
  },
  {
    id: "u-student-1",
    name: "Ali Khan",
    email: "ali@codesthinker.com",
    role: "STUDENT",
    department: "Paid Training",
    phone: "+92 302 3333001",
    joinDate: "2026-08-01",
    track: "Flutter Development",
    batch: "CT-STU-FLUTTER",
    attendancePercent: 88,
  },
  {
    id: "u-student-2",
    name: "Fatima Noor",
    email: "fatima@codesthinker.com",
    role: "STUDENT",
    department: "Paid Training",
    phone: "+92 302 3333002",
    joinDate: "2026-09-01",
    track: "MERN Stack",
    batch: "CT-STU-MERN",
    attendancePercent: 95,
  },
  {
    id: "u-student-3",
    name: "Bilal Ahmed",
    email: "bilal@codesthinker.com",
    role: "STUDENT",
    department: "Paid Training",
    phone: "+92 302 3333003",
    joinDate: "2026-07-15",
    track: "Next.js Frontend",
    batch: "CT-STU-NEXT",
    attendancePercent: 91,
  },
];

export const students = () => people.filter((p) => p.role === "STUDENT");
export const interns = () => people.filter((p) => p.role === "INTERN");
export const staff = () => people.filter((p) => p.role === "STAFF");

export let courses: Course[] = [
  {
    id: "c-flutter-1",
    title: "Flutter Development Internship",
    category: "Flutter",
    batch: "CT-FLUTTER-NOV-26",
    durationMonths: 4,
    monthlyFee: 12000,
    totalFee: 48000,
    installmentFee: 6000,
    published: true,
    startMonth: "2026-08",
    enrolledCount: 28,
    description: "Full Flutter track with Provider and clean architecture.",
    outline: [
      {
        id: "s1",
        title: "Month 1 — Foundations",
        order: 1,
        topics: [
          { id: "t1", title: "Dart & setup", completed: true, order: 1 },
          { id: "t2", title: "Widgets", completed: true, order: 2 },
          { id: "t3", title: "Clean Architecture", completed: true, order: 3 },
          { id: "t4", title: "API basics", completed: true, order: 4 },
        ],
      },
      {
        id: "s2",
        title: "Month 2 — Provider",
        order: 2,
        topics: [
          { id: "t5", title: "ChangeNotifier", completed: true, order: 1 },
          { id: "t6", title: "MultiProvider", completed: true, order: 2 },
          { id: "t7", title: "Selector", completed: false, order: 3 },
        ],
      },
    ],
  },
  {
    id: "c-mern-1",
    title: "MERN Stack Development",
    category: "Node.js",
    batch: "CT-MERN-OCT-26",
    durationMonths: 3,
    monthlyFee: 15000,
    totalFee: 45000,
    installmentFee: 7500,
    published: true,
    startMonth: "2026-09",
    enrolledCount: 18,
    description: "Mongo, Express, React, Node professional track.",
    outline: [
      {
        id: "ns1",
        title: "Month 1",
        order: 1,
        topics: [
          { id: "nt1", title: "Express APIs", completed: true, order: 1 },
          { id: "nt2", title: "Mongo models", completed: false, order: 2 },
        ],
      },
    ],
  },
];

export let feedbackItems: FeedbackItem[] = [
  {
    id: "fb1",
    kind: "REPORT",
    userId: "u-student-1",
    userName: "Ali Khan",
    userRole: "STUDENT",
    title: "Class timing clash",
    body: "Friday 2pm slot overlaps with my college.",
    createdAt: "2026-11-11T16:20:00",
    status: "OPEN",
  },
  {
    id: "fb2",
    kind: "COMPLAIN",
    userId: "u-intern-1",
    userName: "Usman Tariq",
    userRole: "INTERN",
    title: "AC not working in lab",
    body: "Lab 2 AC is off since Monday.",
    createdAt: "2026-11-12T09:10:00",
    status: "OPEN",
  },
];

export let activeSurvey: SurveyDefinition = {
  id: "survey-1",
  title: "November training feedback",
  description: "2-minute survey about your batch experience",
  active: true,
  questions: [
    { id: "q1", text: "How clear are the classes?" },
    { id: "q2", text: "What should we improve?" },
    { id: "q3", text: "Would you recommend Code's Thinker?" },
  ],
};

export let surveyResponses: SurveyResponse[] = [
  {
    id: "sr1",
    surveyId: "survey-1",
    userId: "u-student-2",
    userName: "Fatima Noor",
    userRole: "STUDENT",
    answers: {
      q1: "Very clear",
      q2: "More practice tasks",
      q3: "Yes",
    },
    submittedAt: "2026-11-11T18:00:00",
  },
];

export let adminChats: AdminChatThread[] = [
  {
    id: "chat-1",
    userId: "u-student-1",
    userName: "Ali Khan",
    userRole: "STUDENT",
    lastMessage: "Sir fee screenshot bhej diya hai",
    updatedAt: "2026-11-12T10:30:00",
    unreadByAdmin: 1,
    messages: [
      {
        id: "m1",
        senderId: "u-student-1",
        senderName: "Ali Khan",
        senderRole: "USER",
        text: "Assalam o Alaikum sir",
        sentAt: "10:20",
      },
      {
        id: "m2",
        senderId: "u-admin-1",
        senderName: "Ayaz Aslam",
        senderRole: "ADMIN",
        text: "Walaikum Assalam. Bataiye.",
        sentAt: "10:22",
      },
      {
        id: "m3",
        senderId: "u-student-1",
        senderName: "Ali Khan",
        senderRole: "USER",
        text: "Sir fee screenshot bhej diya hai",
        sentAt: "10:30",
      },
    ],
  },
  {
    id: "chat-2",
    userId: "u-staff-1",
    userName: "Hassan Raza",
    userRole: "STAFF",
    lastMessage: "Batch attendance sheet ready",
    updatedAt: "2026-11-12T09:40:00",
    unreadByAdmin: 0,
    messages: [
      {
        id: "m4",
        senderId: "u-staff-1",
        senderName: "Hassan Raza",
        senderRole: "USER",
        text: "Batch attendance sheet ready",
        sentAt: "09:40",
      },
    ],
  },
];

export function courseProgress(course: Course) {
  const topics = course.outline.flatMap((s) => s.topics);
  const done = topics.filter((t) => t.completed).length;
  const total = topics.length;
  return {
    done,
    total,
    remaining: total - done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/** App-synced attendance (check-in / check-out from mobile) */
export let attendanceRecords: AttendanceRecord[] = [
  {
    id: "a1",
    personId: "u-student-1",
    personName: "Ali Khan",
    role: "STUDENT",
    date: "2026-11-12",
    markedAt: "2026-11-12T09:58:12",
    checkInAt: "2026-11-12T09:58:12",
    checkOutAt: "2026-11-12T14:10:05",
    status: "CHECKED_OUT",
    source: "APP",
  },
  {
    id: "a2",
    personId: "u-intern-1",
    personName: "Usman Tariq",
    role: "INTERN",
    date: "2026-11-12",
    markedAt: "2026-11-12T10:01:44",
    checkInAt: "2026-11-12T10:01:44",
    status: "PRESENT",
    source: "APP",
  },
  {
    id: "a3",
    personId: "u-staff-1",
    personName: "Hassan Raza",
    role: "STAFF",
    date: "2026-11-12",
    markedAt: "2026-11-12T09:45:03",
    checkInAt: "2026-11-12T09:45:03",
    status: "PRESENT",
    source: "APP",
  },
  {
    id: "a4",
    personId: "u-student-2",
    personName: "Fatima Noor",
    role: "STUDENT",
    date: "2026-11-12",
    markedAt: "2026-11-12T10:12:20",
    checkInAt: "2026-11-12T10:12:20",
    status: "LATE",
    source: "APP",
  },
];

export let feeRecords: FeeRecord[] = [
  {
    id: "f1",
    studentId: "u-student-1",
    studentName: "Ali Khan",
    courseTitle: "Flutter Development",
    month: "Nov 2026",
    amount: 12000,
    status: "SENT",
    dueDate: "2026-11-15",
    chat: [
      {
        id: "fc1",
        senderName: "Ayaz Aslam",
        senderRole: "ADMIN",
        text: "JazzCash 0300-0000001 pe transfer karke screenshot bhejo.",
        sentAt: "09:00",
      },
      {
        id: "fc2",
        senderName: "Ali Khan",
        senderRole: "STUDENT",
        text: "Payment screenshot attached. Please approve.",
        sentAt: "10:22",
        hasScreenshot: true,
      },
    ],
  },
  {
    id: "f2",
    studentId: "u-student-2",
    studentName: "Fatima Noor",
    courseTitle: "MERN Stack",
    month: "Nov 2026",
    amount: 15000,
    status: "PAID",
    dueDate: "2026-11-05",
    chat: [
      {
        id: "fc3",
        senderName: "Ayaz Aslam",
        senderRole: "ADMIN",
        text: "Payment verified. Fee marked PAID.",
        sentAt: "11:00",
      },
    ],
  },
  {
    id: "f3",
    studentId: "u-student-3",
    studentName: "Bilal Ahmed",
    courseTitle: "Next.js Frontend",
    month: "Nov 2026",
    amount: 10000,
    status: "DUE",
    dueDate: "2026-11-12",
    chat: [
      {
        id: "fc4",
        senderName: "Ayaz Aslam",
        senderRole: "ADMIN",
        text: "Fee due Rs 10,000. Online number: 0300-0000001",
        sentAt: "08:30",
      },
    ],
  },
];

export let staffTasks: AssignedTask[] = [
  {
    id: "task-s1",
    title: "Prepare Flutter batch attendance sheet",
    description: "Verify today's app attendance sync and mark anomalies.",
    studyNotes: "Check late marks after 10:05 AM.",
    assignedToId: "u-staff-1",
    assignedToName: "Hassan Raza",
    assignedBy: "Ayaz Aslam",
    audience: "STAFF",
    status: "IN_PROGRESS",
    dueAt: "2026-11-12T18:00:00",
    timerMinutes: 40,
    spentMinutes: 12,
    createdAt: "2026-11-12T08:00:00",
    updatedAt: "12 min ago",
    chat: [
      {
        id: "c1",
        senderName: "Ayaz Aslam",
        senderRole: "ADMIN",
        text: "Ali Khan late mark confirm karo.",
        sentAt: "08:05 AM",
      },
    ],
  },
];

export let internProjects: InternProject[] = [
  {
    id: "proj-1",
    title: "Code's Thinker LMS Student App polish",
    description: "Attendance real-time clock + role dashboards polish.",
    internId: "u-intern-1",
    internName: "Usman Tariq",
    assignedBy: "Ayaz Aslam",
    status: "IN_PROGRESS",
    deadline: "2026-11-20",
    techStack: "Flutter + Provider",
    repoUrl: "https://github.com/codesthinker/lms-mobile",
    progressPercent: 55,
    updatedAt: "20 min ago",
  },
  {
    id: "proj-2",
    title: "Intern portal API contracts",
    description: "Draft NestJS DTOs for projects module.",
    internId: "u-intern-2",
    internName: "Ayesha Siddiqui",
    assignedBy: "Ayaz Aslam",
    status: "ASSIGNED",
    deadline: "2026-11-18",
    techStack: "NestJS + Prisma",
    progressPercent: 10,
    updatedAt: "1 hr ago",
  },
];

/** Admin inbox — no recipient / personal names (privacy). */
export let appNotifications: AppNotification[] = [
  {
    id: "n1",
    title: "Attendance update",
    body: "A check-in was recorded from the app",
    type: "attendance",
    createdAt: "2026-11-12T09:58:12",
    read: false,
  },
  {
    id: "n2",
    title: "Attendance update",
    body: "A check-in was recorded from the app",
    type: "attendance",
    createdAt: "2026-11-12T10:01:44",
    read: false,
  },
  {
    id: "n3",
    title: "Late attendance",
    body: "A late check-in was recorded",
    type: "attendance",
    createdAt: "2026-11-12T10:12:20",
    read: false,
  },
  {
    id: "n4",
    title: "Fee reminder",
    body: "A fee due reminder was sent",
    type: "fee",
    createdAt: "2026-11-12T08:00:00",
    read: true,
  },
];

export const dashboardMetrics: DashboardMetrics = {
  students: students().length,
  interns: interns().length,
  staff: staff().length,
  attendanceTodayPercent: 86,
  feesPending: feeRecords
    .filter((f) => f.status !== "PAID")
    .reduce((s, f) => s + f.amount, 0),
  openStaffTasks: staffTasks.filter((t) => t.status !== "DONE").length,
  openInternProjects: internProjects.filter((p) => p.status !== "DONE").length,
};

/** Keep old names used by existing pages */
export const users = people;
export const assignedTasks = staffTasks;
export const assignablePeople = staff().map((p) => ({
  id: p.id,
  name: p.name,
  role: p.department,
}));
export const employmentRows = people
  .filter((p) => p.role !== "SUPER_ADMIN")
  .map((p) => ({
    id: p.id,
    employeeName: p.name,
    role: p.role,
    department: p.department,
    courseTitle: p.track ?? "—",
    attendancePercent: p.attendancePercent,
    topicsDone: 0,
    topicsTotal: 0,
    feeStatus: "DUE" as const,
    joinDate: p.joinDate,
  }));
export const dailyTasks = staffTasks.map((t) => ({
  id: t.id,
  employeeName: t.assignedToName,
  role: "STAFF",
  task: t.title,
  courseTitle: "Staff Ops",
  status: t.status,
  updatedAt: t.updatedAt,
  dueTime: new Date(t.dueAt).toLocaleString(),
}));
export const studentUser = students()[0];
export const instructorUser = staff()[0];
