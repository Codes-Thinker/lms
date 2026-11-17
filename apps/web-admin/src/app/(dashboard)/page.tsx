"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  FolderKanban,
  BriefcaseBusiness,
  CalendarCheck,
  Wallet,
  ListTodo,
  MessageSquare,
  Flag,
  AlertCircle,
  ClipboardCheck,
  Radio,
  Users,
  Star,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { StatRing } from "@/components/ui/stat-ring";
import { api, getAdminUser } from "@/lib/api";
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/components/ui/notifications-provider";
import { useAdminActivity } from "@/components/ui/admin-activity-provider";
import { DashboardSkeleton } from "@/components/ui/skeleton";

type Overview = {
  students: number;
  interns: number;
  staff: number;
  teachers?: number;
  allUsers: number;
  newStudentsThisMonth: number;
  avgCourseRating: number;
  coursesCount: number;
  surveyResponses: number;
  attendanceTodayPercent: number;
  feesPending: number;
  openStaffTasks: number;
  openInternProjects: number;
  attendanceTodayCount?: number;
};

type AttendanceRow = {
  id: string;
  personName: string;
  role: string;
  status: string;
  checkInAt?: string | null;
};

type FeeRow = {
  id: string;
  studentId?: string;
  studentName: string;
  courseTitle: string;
  amount: number;
  status: string;
};

type UserRow = {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  accountType: string;
  track?: string | null;
  status?: string;
  profileImage?: string | null;
};

type Activity = {
  openTickets: number;
  reports: number;
  complains: number;
  surveys: number;
  feesAwaitingReview: number;
  chatUnread: number;
  chatUnreadThreads: number;
  recentTickets: {
    id: string;
    kind: string;
    title: string;
    userName: string;
    userId: string;
    status: string;
    createdAt: string;
  }[];
  recentSurveys: {
    id: string;
    userName: string;
    userId: string;
    surveyTitle: string;
    submittedAt: string;
  }[];
};

function monthLabel() {
  return new Date().toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { unread } = useNotifications();
  const { chatUnread: unreadMessages } = useAdminActivity();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [people, setPeople] = useState<UserRow[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = getAdminUser()?.name || getAdminUser()?.fullName || "Admin";

  const loadCore = useCallback(async () => {
    const [ov, att, feeList, users, act] = await Promise.all([
      api<Overview>("/reports/overview"),
      api<AttendanceRow[]>("/attendance"),
      api<FeeRow[]>("/fees"),
      api<{ items: UserRow[] }>("/users?pageSize=12"),
      api<Activity>("/support/activity-summary"),
    ]);
    setOverview(ov);
    setAttendance(att.slice(0, 5));
    setFees(
      feeList
        .filter(
          (f) =>
            f.status === "SENT" || f.status === "DUE" || f.status === "PARTIAL"
        )
        .slice(0, 5)
    );
    setPeople(users.items);
    setActivity(act);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadCore();
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    const id = window.setInterval(() => {
      loadCore().catch(() => {});
    }, 45000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [loadCore]);

  const students = overview?.students ?? 0;
  const teachers = overview?.teachers ?? overview?.staff ?? 0;
  const interns = overview?.interns ?? 0;
  const allUsers = overview?.allUsers ?? students + teachers + interns;
  const rating = overview?.avgCourseRating ?? 0;
  const newStudents = overview?.newStudentsThisMonth ?? 0;
  const attendancePct = overview?.attendanceTodayPercent ?? 0;

  const breakdown = useMemo(() => {
    const parts = [
      { key: "students", label: "Students", count: students, color: "bg-blue-500", href: "/students" },
      { key: "teachers", label: "Teachers", count: teachers, color: "bg-emerald-500", href: "/staff" },
      { key: "interns", label: "Interns", count: interns, color: "bg-sky-400", href: "/interns" },
    ];
    return parts;
  }, [students, teachers, interns]);

  const supportCards = [
    {
      label: "Fee screenshots",
      value: activity?.feesAwaitingReview ?? 0,
      href: "/fees",
      icon: Wallet,
    },
    {
      label: "Reports open",
      value: activity?.reports ?? 0,
      href: "/feedback",
      icon: Flag,
    },
    {
      label: "Complains open",
      value: activity?.complains ?? 0,
      href: "/feedback",
      icon: AlertCircle,
    },
    {
      label: "Survey answers",
      value: activity?.surveys ?? overview?.surveyResponses ?? 0,
      href: "/feedback",
      icon: ClipboardCheck,
    },
    {
      label: "Chat unread",
      value: activity?.chatUnread ?? unreadMessages,
      href: "/inbox",
      icon: MessageSquare,
    },
  ];

  if (!overview && !error) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-enter space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-[#EFF6FF] via-white to-[#F0FDFA] p-6 sm:p-7 animate-fade-up">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-400/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-teal-300/20 blur-3xl"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700/80">Dashboard</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Welcome, {name}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-slate-500">
              People, attendance, ratings, and live support at a glance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" className="gap-1">
              <Radio className="h-3 w-3" />
              Live
            </Badge>
            <Badge variant="default">{unread} alerts</Badge>
            {unreadMessages > 0 ? (
              <Badge variant="warning">{unreadMessages} chat</Badge>
            ) : null}
          </div>
        </div>
        {error ? (
          <p className="relative mt-3 text-sm text-red-600">{error}</p>
        ) : null}
      </section>

      {/* All users + rings */}
      <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <div className="glass-card overflow-hidden p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-blue-50 p-2.5 text-blue-600">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-500">All users</p>
                <p className="mt-0.5 text-4xl font-semibold tracking-tight text-slate-900">
                  {overview ? allUsers : "-"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Students + teachers + interns
                </p>
              </div>
            </div>
            <Link
              href="/users"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Manage users
            </Link>
          </div>

          {/* Segmented proportion bar */}
          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
            {breakdown.map((b) => {
              const pct = allUsers > 0 ? (b.count / allUsers) * 100 : 0;
              if (pct <= 0) return null;
              return (
                <div
                  key={b.key}
                  className={cn(b.color, "transition-all duration-500")}
                  style={{ width: `${pct}%` }}
                  title={`${b.label}: ${b.count}`}
                />
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {breakdown.map((b) => {
              const Icon =
                b.key === "students"
                  ? GraduationCap
                  : b.key === "teachers"
                    ? BriefcaseBusiness
                    : FolderKanban;
              return (
                <Link
                  key={b.key}
                  href={b.href}
                  className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      {b.label}
                    </span>
                    <Icon className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-blue-600" />
                  </div>
                  <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">
                    {overview ? b.count : "-"}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="glass-card flex flex-col justify-center p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900">Pulse</h3>
              <p className="text-sm text-slate-500">
                Rings for today, {monthLabel()}
              </p>
            </div>
            <Link
              href="/attendance"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Attendance
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <StatRing
              value={attendancePct}
              label="Attendance"
              sublabel="Today"
              tone="amber"
              size={100}
            />
            <StatRing
              value={rating}
              max={5}
              display={overview ? rating.toFixed(1) : "-"}
              label="Rating"
              sublabel={
                overview
                  ? `${overview.coursesCount} courses`
                  : "Courses"
              }
              tone="emerald"
              size={100}
            />
            <StatRing
              value={newStudents}
              max={Math.max(10, newStudents)}
              display={overview ? String(newStudents) : "-"}
              label="New students"
              sublabel="This month"
              tone="sky"
              size={100}
            />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
            <div className="flex flex-col items-center gap-1">
              <CalendarCheck className="h-3.5 w-3.5 text-amber-600" />
              <span>
                {overview?.attendanceTodayCount ?? 0} marks
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Star className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                {overview?.surveyResponses ?? 0} surveys
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <UserPlus className="h-3.5 w-3.5 text-sky-600" />
              <span>{monthLabel()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Support */}
      <div className="glass-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Help &amp; support</h3>
            <p className="text-sm text-slate-500">
              Live queue from the app: fees, reports, chat, surveys
            </p>
          </div>
          <Link
            href="/feedback"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Open feedback
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {supportCards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.label}
                href={c.href}
                className="rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-slate-50/80 p-3.5 transition hover:border-blue-200 hover:to-blue-50/40"
              >
                <div className="flex items-center gap-2 text-slate-500">
                  <Icon className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs">{c.label}</span>
                </div>
                <p className="mt-2 text-xl font-semibold">{c.value}</p>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Latest reports / complains
            </p>
            <ul className="space-y-2 text-sm">
              {(activity?.recentTickets ?? []).map((t) => (
                <li
                  key={t.id}
                  className="flex justify-between gap-2 border-t border-slate-100 pt-2"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-slate-800">{t.kind}</span>
                    {", "}
                    <Link
                      href={`/users/${t.userId}`}
                      className="text-blue-700 hover:underline"
                    >
                      {t.userName}
                    </Link>
                    {": "}
                    {t.title}
                  </span>
                  <Badge variant="secondary">{t.status}</Badge>
                </li>
              ))}
              {(activity?.recentTickets.length ?? 0) === 0 ? (
                <li className="text-slate-500">No open tickets</li>
              ) : null}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Latest surveys
            </p>
            <ul className="space-y-2 text-sm">
              {(activity?.recentSurveys ?? []).map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between gap-2 border-t border-slate-100 pt-2"
                >
                  <span className="min-w-0 truncate">
                    <Link
                      href={`/users/${s.userId}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {s.userName}
                    </Link>
                    {", "}
                    {s.surveyTitle}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(s.submittedAt).toLocaleString()}
                  </span>
                </li>
              ))}
              {(activity?.recentSurveys.length ?? 0) === 0 ? (
                <li className="text-slate-500">No survey answers yet</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>

      {/* People */}
      <div className="glass-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">People</h3>
            <p className="text-sm text-slate-500">
              Students, Interns, Teachers with profile
            </p>
          </div>
          <Link
            href="/users"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Manage users
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((p) => {
            const display = p.name || p.fullName || p.email;
            return (
              <Link
                key={p.id}
                href={`/users/${p.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/40"
              >
                <UserAvatar
                  name={display}
                  email={p.email}
                  accountType={p.accountType}
                  src={p.profileImage}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    {display}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {roleLabel(p.accountType)}
                    {p.track ? `, ${p.track}` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
          {people.length === 0 ? (
            <p className="text-sm text-slate-500">
              No users yet. Add from Users
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold">Student fees pending</h3>
            </div>
            <Link href="/fees" className="text-sm text-blue-600 hover:underline">
              Fees module
            </Link>
          </div>
          <p className="mb-3 text-2xl font-semibold">
            Rs {(overview?.feesPending ?? 0).toLocaleString()}
          </p>
          <ul className="space-y-2 text-sm">
            {fees.map((f) => (
              <li
                key={f.id}
                className="flex justify-between border-t border-slate-100 pt-2"
              >
                {f.studentId ? (
                  <Link
                    href={`/users/${f.studentId}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {f.studentName}
                  </Link>
                ) : (
                  <span>{f.studentName}</span>
                )}
                <span className="text-slate-600">
                  {f.status}, {f.courseTitle}, Rs{" "}
                  {f.amount.toLocaleString()}
                </span>
              </li>
            ))}
            {fees.length === 0 ? (
              <li className="text-slate-500">No pending student fees</li>
            ) : null}
          </ul>
        </div>

        <div className="glass-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold">Today attendance</h3>
          </div>
          <p className="mb-3 text-sm text-slate-500">
            Teacher tasks {overview?.openStaffTasks ?? 0}, Intern projects{" "}
            {overview?.openInternProjects ?? 0}
          </p>
          <ul className="space-y-2 text-sm">
            {attendance.map((a) => (
              <li
                key={a.id}
                className="flex justify-between border-t border-slate-100 pt-2"
              >
                <span>
                  {a.personName}, {a.role}
                </span>
                <span className="font-medium">{a.status}</span>
              </li>
            ))}
            {attendance.length === 0 ? (
              <li className="text-slate-500">No marks yet</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
