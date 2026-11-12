export type UserRole = "SUPER_ADMIN" | "STAFF" | "INTERN" | "STUDENT";
export type FeeStatus = "PAID" | "PARTIAL" | "DUE";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";
export type TaskStatus = "DONE" | "IN_PROGRESS" | "PENDING";
export type ProjectStatus = "ASSIGNED" | "IN_PROGRESS" | "REVIEW" | "DONE";

export interface Person {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  phone: string;
  joinDate: string;
  track?: string;
  batch?: string;
  attendancePercent: number;
}

export interface Topic {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface OutlineSection {
  id: string;
  title: string;
  order: number;
  topics: Topic[];
}

export interface Course {
  id: string;
  title: string;
  category: string;
  batch: string;
  durationMonths: number;
  monthlyFee: number;
  totalFee: number;
  /** Suggested installment amount (e.g. half of monthly or custom) */
  installmentFee: number;
  installmentCount: number;
  thumbnailUrl?: string;
  published: boolean;
  startMonth: string;
  outline: OutlineSection[];
  enrolledCount: number;
  description?: string;
}

export type FeedbackKind = "REPORT" | "COMPLAIN" | "SURVEY";

export interface FeedbackItem {
  id: string;
  kind: FeedbackKind;
  userId: string;
  userName: string;
  userRole: UserRole;
  title: string;
  body: string;
  rating?: number;
  createdAt: string;
  status: "OPEN" | "REVIEWED" | "CLOSED";
}

export interface SurveyQuestion {
  id: string;
  text: string;
}

export interface SurveyDefinition {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  active: boolean;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  answers: Record<string, string>;
  submittedAt: string;
}

export interface AdminChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "ADMIN" | "USER";
  text: string;
  sentAt: string;
}

export interface AdminChatThread {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  lastMessage: string;
  updatedAt: string;
  unreadByAdmin: number;
  messages: AdminChatMessage[];
}

export interface AttendanceRecord {
  id: string;
  personId: string;
  personName: string;
  role: UserRole;
  date: string;
  markedAt: string;
  checkInAt: string;
  checkOutAt?: string;
  status: AttendanceStatus | "CHECKED_OUT";
  source: "APP";
}

export interface FeeChatMessage {
  id: string;
  senderName: string;
  senderRole: "STUDENT" | "ADMIN";
  text: string;
  sentAt: string;
  hasScreenshot?: boolean;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  courseTitle: string;
  month: string;
  amount: number;
  status: FeeStatus | "SENT";
  dueDate: string;
  chat: FeeChatMessage[];
}

export interface AdminPaymentInfo {
  adminName: string;
  phone: string;
  jazzCash: string;
  easyPaisa: string;
  bankTitle: string;
  bankAccount: string;
}

export interface TaskChatMessage {
  id: string;
  senderName: string;
  senderRole: "ADMIN" | "USER";
  text: string;
  sentAt: string;
}

export interface AssignedTask {
  id: string;
  title: string;
  description: string;
  studyNotes: string;
  assignedToId: string;
  assignedToName: string;
  assignedBy: string;
  audience: "STAFF";
  status: TaskStatus;
  dueAt: string;
  timerMinutes: number;
  spentMinutes: number;
  createdAt: string;
  updatedAt: string;
  chat: TaskChatMessage[];
}

export interface InternProject {
  id: string;
  title: string;
  description: string;
  internId: string;
  internName: string;
  assignedBy: string;
  status: ProjectStatus;
  deadline: string;
  techStack: string;
  repoUrl?: string;
  progressPercent: number;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type:
    | "attendance"
    | "fee"
    | "task"
    | "project"
    | "system"
    | "chat"
    | "report"
    | "complain"
    | "survey"
    | "general";
  createdAt: string;
  read: boolean;
  data?: Record<string, string> | null;
}

export interface DashboardMetrics {
  students: number;
  interns: number;
  staff: number;
  attendanceTodayPercent: number;
  feesPending: number;
  openStaffTasks: number;
  openInternProjects: number;
}
