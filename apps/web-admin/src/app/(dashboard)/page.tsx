"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { api, getAdminUser } from "@/lib/api";
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/components/ui/notifications-provider";
import { useChatInbox } from "@/components/ui/chat-inbox-provider";

type Overview = {
  students: number;
  interns: number;
  staff: number;
  attendanceTodayPercent: number;
  feesPending: number;
  openStaffTasks: number;
  openInternProjects: number;
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

export default function DashboardPage() {
  const { unread } = useNotifications();
  const { unreadMessages } = useChatInbox();
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
      api<{ items: UserRow[] }>("/users?pageSize=24"),
      api<Activity>("/support/activity-summary"),
    ]);
    setOverview(ov);
    setAttendance(att.slice(0, 6));
    setFees(
      feeList
        .filter((f) => f.status === "SENT" || f.status === "DUE" || f.status === "PARTIAL")
        .slice(0, 6)
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
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    const id = window.setInterval(() => {
      loadCore().catch(() => {});
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [loadCore]);

  const kpis = [
    {
      label: "Students",
      value: String(overview?.students ?? "—"),
      href: "/students",
      icon: GraduationCap,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Interns",
      value: String(overview?.interns ?? "—"),
      href: "/interns",
      icon: FolderKanban,
      tone: "bg-sky-50 text-sky-600",
    },
    {
      label: "Teachers",
      value: String(overview?.staff ?? "—"),
      href: "/staff",
      icon: BriefcaseBusiness,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Attendance today",
      value: overview ? `${overview.attendanceTodayPercent}%` : "—",
      href: "/attendance",
      icon: CalendarCheck,
      tone: "bg-amber-50 text-amber-600",
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
      value: activity?.surveys ?? 0,
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

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Welcome, {name}</h2>
            <p className="text-sm text-slate-500">
              Live Help &amp; support from the app — fees, reports, chat, surveys
            </p>
          </div>
          <div className="flex items-center gap-2">
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
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="glass-card block p-5 transition hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{kpi.label}</p>
                <span className={cn("rounded-xl p-2", kpi.tone)}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{kpi.value}</p>
            </Link>
          );
        })}
      </div>

      <div className="glass-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Help &amp; support — live</h3>
            <p className="text-sm text-slate-500">
              Same portions as student app · updates every 5s · bell + sound
            </p>
          </div>
          <Link href="/feedback" className="text-sm font-medium text-blue-600 hover:underline">
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
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition hover:border-blue-200 hover:bg-blue-50/50"
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
                    {" · "}
                    <Link
                      href={`/users/${t.userId}`}
                      className="text-blue-700 hover:underline"
                    >
                      {t.userName}
                    </Link>
                    {" — "}
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
                    {" · "}
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

      <div className="glass-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">People</h3>
            <p className="text-sm text-slate-500">
              Students · Interns · Teachers — with profile
            </p>
          </div>
          <Link href="/users" className="text-sm font-medium text-blue-600 hover:underline">
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
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/40"
              >
                <UserAvatar
                  name={display}
                  email={p.email}
                  accountType={p.accountType}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{display}</p>
                  <p className="truncate text-xs text-slate-500">
                    {roleLabel(p.accountType)}
                    {p.track ? ` · ${p.track}` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
          {people.length === 0 ? (
            <p className="text-sm text-slate-500">No users yet — add from Users</p>
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
              <li key={f.id} className="flex justify-between border-t border-slate-100 pt-2">
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
                  {f.status} · {f.courseTitle} · Rs {f.amount.toLocaleString()}
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
            Teacher tasks {overview?.openStaffTasks ?? 0} · Intern projects{" "}
            {overview?.openInternProjects ?? 0}
          </p>
          <ul className="space-y-2 text-sm">
            {attendance.map((a) => (
              <li key={a.id} className="flex justify-between border-t border-slate-100 pt-2">
                <span>
                  {a.personName} · {a.role}
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
