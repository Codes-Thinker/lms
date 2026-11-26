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
  BookOpen,
  ArrowUpRight,
  Download,
  Megaphone,
  ShieldCheck,
  Inbox,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { GlassSparkline } from "@/components/ui/glass-sparkline";
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
  const feesPending = overview?.feesPending ?? 0;

  const breakdown = useMemo(() => {
    return [
      { key: "students", label: "Students", count: students, color: "bg-amber-400", href: "/students" },
      { key: "teachers", label: "Teachers", count: teachers, color: "bg-emerald-400", href: "/staff" },
      { key: "interns", label: "Interns", count: interns, color: "bg-orange-300", href: "/interns" },
    ];
  }, [students, teachers, interns]);

  const kpiCards = [
    {
      label: "Active people",
      value: overview ? String(allUsers) : "—",
      hint: "Students + teachers + interns",
      tone: "default" as const,
      spark: "emerald" as const,
      href: "/users",
      points: [10, 14, 12, 18, 16, 21, 19, 24],
    },
    {
      label: "Open deals",
      value: overview ? String(activity?.feesAwaitingReview ?? 0) : "—",
      hint: "Fee screenshots awaiting review",
      tone: "default" as const,
      spark: "rose" as const,
      href: "/fees",
      points: [22, 18, 20, 14, 16, 12, 15, 11],
    },
    {
      label: "Revenue pending",
      value: overview ? `Rs ${feesPending.toLocaleString()}` : "—",
      hint: "Student fees still due",
      tone: "accent" as const,
      spark: "white" as const,
      href: "/fees",
      points: [8, 12, 10, 16, 14, 20, 18, 23],
    },
    {
      label: "System uptime",
      value: overview ? `${attendancePct.toFixed(0)}%` : "—",
      hint: "Attendance checked in today",
      tone: "default" as const,
      spark: "emerald" as const,
      href: "/attendance",
      points: [16, 17, 18, 19, 20, 21, 22, 24],
    },
  ];

  const quickActions = [
    {
      label: "Review fee requests",
      href: "/fees",
      icon: Wallet,
      count: activity?.feesAwaitingReview ?? 0,
    },
    {
      label: "Answer support",
      href: "/inbox",
      icon: Inbox,
      count: activity?.chatUnread ?? unreadMessages,
    },
    {
      label: "New announcement",
      href: "/courses",
      icon: Megaphone,
    },
    {
      label: "Check attendance",
      href: "/attendance",
      icon: CalendarCheck,
    },
    {
      label: "Download reports",
      href: "/feedback",
      icon: Download,
    },
    {
      label: "Verify certificates",
      href: "/certificates",
      icon: ShieldCheck,
    },
  ];

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
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/90 drop-shadow-sm">
            Luxury glass console
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-[32px]">
            Welcome, {name}
          </h1>
          <p className="mt-1 max-w-xl text-sm font-medium text-white/85 drop-shadow-sm">
            Live LMS pulse — people, fees, attendance, and support at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="gap-1 border-black/5 bg-white text-[#1a120e] shadow-sm">
            <Radio className="h-3 w-3 text-emerald-600" />
            Live
          </Badge>
          <Badge className="border-black/5 bg-white text-[#1a120e] shadow-sm">
            {unread} alerts
          </Badge>
          {unreadMessages > 0 ? (
            <Badge className="border-rose-200 bg-rose-50 text-rose-800 shadow-sm">
              {unreadMessages} chat
            </Badge>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="glass-card px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {/* KPI glass strip — image-style */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card, i) => (
          <Link
            key={card.label}
            href={card.href}
            className={cn(
              "glass-card glass-card-interactive group block p-5 animate-fade-up",
              card.tone === "accent" && "glass-card-accent",
              `stagger-${i + 1}`
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[28px] font-extrabold tracking-tight",
                    card.tone === "accent" ? "text-white" : "text-[#1C1410]"
                  )}
                >
                  {card.value}
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm font-semibold",
                    card.tone === "accent" ? "text-white/85" : "text-[#1C1410]/75"
                  )}
                >
                  {card.label}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    card.tone === "accent" ? "text-white/65" : "text-[#1C1410]/50"
                  )}
                >
                  {card.hint}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <ArrowUpRight
                  className={cn(
                    "h-4 w-4 opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100",
                    card.tone === "accent" ? "text-white" : "text-[#1C1410]"
                  )}
                />
                <GlassSparkline points={card.points} tone={card.spark} />
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Quick actions — 2-col glass chips */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {quickActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                "glass-action flex items-center gap-3 rounded-2xl px-4 py-3.5 animate-fade-up",
                `stagger-${Math.min(i + 1, 6)}`
              )}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1C1410]/08 text-[#1C1410] ring-1 ring-white/35">
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <span className="flex-1 text-sm font-semibold text-[#1C1410]">
                {action.label}
              </span>
              {typeof action.count === "number" && action.count > 0 ? (
                <span className="rounded-full bg-[#1C1410] px-2 py-0.5 text-[10px] font-bold text-white">
                  {action.count > 99 ? "99+" : action.count}
                </span>
              ) : (
                <ArrowUpRight className="h-4 w-4 text-[#1C1410]/40" />
              )}
            </Link>
          );
        })}
      </section>

      {/* People + pulse */}
      <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <div className="glass-card glass-card-strong overflow-hidden p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-[#1C1410]/08 p-2.5 text-[#1C1410] ring-1 ring-white/40">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-[#1C1410]/55">All users</p>
                <p className="mt-0.5 text-4xl font-semibold tracking-tight text-[#1C1410]">
                  {overview ? allUsers : "-"}
                </p>
                <p className="mt-1 text-xs text-[#1C1410]/45">
                  Students + teachers + interns
                </p>
              </div>
            </div>
            <Link
              href="/users"
              className="text-sm font-semibold text-[#1C1410] underline-offset-4 hover:underline"
            >
              Manage users
            </Link>
          </div>

          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-white/35">
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
                  className="group rounded-2xl border border-white/35 bg-white/25 p-3.5 transition hover:bg-white/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#1C1410]/55">
                      {b.label}
                    </span>
                    <Icon className="h-3.5 w-3.5 text-[#1C1410]/40 transition group-hover:text-[#1C1410]" />
                  </div>
                  <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[#1C1410]">
                    {overview ? b.count : "-"}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="glass-card glass-card-strong flex flex-col justify-center p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[#1C1410]">Pulse</h3>
              <p className="text-sm text-[#1C1410]/55">
                Rings for today, {monthLabel()}
              </p>
            </div>
            <Link
              href="/attendance"
              className="text-sm font-semibold text-[#1C1410] underline-offset-4 hover:underline"
            >
              Attendance
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-white/30 bg-white/25 p-3">
              <p className="text-2xl font-extrabold text-[#1C1410]">
                {overview ? `${Math.round(attendancePct)}%` : "—"}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[#1C1410]/55">
                Attendance
              </p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/25 p-3">
              <p className="text-2xl font-extrabold text-[#1C1410]">
                {overview ? rating.toFixed(1) : "—"}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[#1C1410]/55">
                Rating
              </p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/25 p-3">
              <p className="text-2xl font-extrabold text-[#1C1410]">
                {overview ? newStudents : "—"}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[#1C1410]/55">
                New students
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/25 pt-4 text-center text-xs text-[#1C1410]/55">
            <div className="flex flex-col items-center gap-1">
              <CalendarCheck className="h-3.5 w-3.5 text-amber-700" />
              <span>{overview?.attendanceTodayCount ?? 0} marks</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Star className="h-3.5 w-3.5 text-emerald-700" />
              <span>{overview?.surveyResponses ?? 0} surveys</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <UserPlus className="h-3.5 w-3.5 text-orange-700" />
              <span>{monthLabel()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Support */}
      <div className="glass-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-[#1C1410]">Help &amp; support</h3>
            <p className="text-sm text-[#1C1410]/55">
              Live queue from the app: fees, reports, chat, surveys
            </p>
          </div>
          <Link
            href="/feedback"
            className="text-sm font-semibold text-[#1C1410] underline-offset-4 hover:underline"
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
                className="rounded-2xl border border-white/30 bg-white/25 p-3.5 transition hover:bg-white/40"
              >
                <div className="flex items-center gap-2 text-[#1C1410]/55">
                  <Icon className="h-3.5 w-3.5 text-[#1C1410]" />
                  <span className="text-xs">{c.label}</span>
                </div>
                <p className="mt-2 text-xl font-semibold text-[#1C1410]">{c.value}</p>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1C1410]/45">
              Latest reports / complains
            </p>
            <ul className="space-y-2 text-sm">
              {(activity?.recentTickets ?? []).map((t) => (
                <li
                  key={t.id}
                  className="flex justify-between gap-2 border-t border-white/25 pt-2"
                >
                  <span className="min-w-0 truncate text-[#1C1410]/85">
                    <span className="font-medium text-[#1C1410]">{t.kind}</span>
                    {", "}
                    <Link
                      href={`/users/${t.userId}`}
                      className="font-semibold text-[#1C1410] underline-offset-2 hover:underline"
                    >
                      {t.userName}
                    </Link>
                    {": "}
                    {t.title}
                  </span>
                  <Badge className="border-white/30 bg-white/30 text-[#1C1410]">
                    {t.status}
                  </Badge>
                </li>
              ))}
              {(activity?.recentTickets.length ?? 0) === 0 ? (
                <li className="text-[#1C1410]/55">No open tickets</li>
              ) : null}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1C1410]/45">
              Latest surveys
            </p>
            <ul className="space-y-2 text-sm">
              {(activity?.recentSurveys ?? []).map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between gap-2 border-t border-white/25 pt-2"
                >
                  <span className="min-w-0 truncate text-[#1C1410]/85">
                    <Link
                      href={`/users/${s.userId}`}
                      className="font-medium text-[#1C1410] underline-offset-2 hover:underline"
                    >
                      {s.userName}
                    </Link>
                    {", "}
                    {s.surveyTitle}
                  </span>
                  <span className="shrink-0 text-xs text-[#1C1410]/45">
                    {new Date(s.submittedAt).toLocaleString()}
                  </span>
                </li>
              ))}
              {(activity?.recentSurveys.length ?? 0) === 0 ? (
                <li className="text-[#1C1410]/55">No survey answers yet</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>

      {/* People */}
      <div className="glass-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-[#1C1410]">People</h3>
            <p className="text-sm text-[#1C1410]/55">
              Students, Interns, Teachers with profile
            </p>
          </div>
          <Link
            href="/users"
            className="text-sm font-semibold text-[#1C1410] underline-offset-4 hover:underline"
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
                className="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/25 p-3 transition hover:bg-white/40"
              >
                <UserAvatar
                  name={display}
                  email={p.email}
                  accountType={p.accountType}
                  src={p.profileImage}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[#1C1410]">
                    {display}
                  </p>
                  <p className="truncate text-xs text-[#1C1410]/55">
                    {roleLabel(p.accountType)}
                    {p.track ? `, ${p.track}` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
          {people.length === 0 ? (
            <p className="text-sm text-[#1C1410]/55">
              No users yet. Add from Users
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[#1C1410]" />
              <h3 className="font-semibold text-[#1C1410]">Student fees pending</h3>
            </div>
            <Link
              href="/fees"
              className="text-sm font-semibold text-[#1C1410] underline-offset-4 hover:underline"
            >
              Fees module
            </Link>
          </div>
          <p className="mb-3 text-2xl font-semibold text-[#1C1410]">
            Rs {(overview?.feesPending ?? 0).toLocaleString()}
          </p>
          <ul className="space-y-2 text-sm">
            {fees.map((f) => (
              <li
                key={f.id}
                className="flex justify-between border-t border-white/25 pt-2 text-[#1C1410]/85"
              >
                {f.studentId ? (
                  <Link
                    href={`/users/${f.studentId}`}
                    className="font-medium text-[#1C1410] underline-offset-2 hover:underline"
                  >
                    {f.studentName}
                  </Link>
                ) : (
                  <span>{f.studentName}</span>
                )}
                <span>
                  {f.status}, {f.courseTitle}, Rs {f.amount.toLocaleString()}
                </span>
              </li>
            ))}
            {fees.length === 0 ? (
              <li className="text-[#1C1410]/55">No pending student fees</li>
            ) : null}
          </ul>
        </div>

        <div className="glass-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-[#1C1410]" />
            <h3 className="font-semibold text-[#1C1410]">Today attendance</h3>
          </div>
          <p className="mb-3 text-sm text-[#1C1410]/55">
            Teacher tasks {overview?.openStaffTasks ?? 0}, Intern projects{" "}
            {overview?.openInternProjects ?? 0}
          </p>
          <ul className="space-y-2 text-sm">
            {attendance.map((a) => (
              <li
                key={a.id}
                className="flex justify-between border-t border-white/25 pt-2 text-[#1C1410]/85"
              >
                <span>
                  {a.personName}, {a.role}
                </span>
                <span className="font-medium text-[#1C1410]">{a.status}</span>
              </li>
            ))}
            {attendance.length === 0 ? (
              <li className="text-[#1C1410]/55">No marks yet</li>
            ) : null}
          </ul>
          <div className="mt-4 flex items-center gap-2 text-xs text-[#1C1410]/50">
            <BookOpen className="h-3.5 w-3.5" />
            {overview?.coursesCount ?? 0} courses in catalog
          </div>
        </div>
      </div>
    </div>
  );
}
