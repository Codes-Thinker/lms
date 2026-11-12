"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  FolderKanban,
  BriefcaseBusiness,
  CalendarCheck,
  Wallet,
  ListTodo,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { api, getAdminUser } from "@/lib/api";
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/components/ui/notifications-provider";

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

export default function DashboardPage() {
  const { unread } = useNotifications();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [people, setPeople] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const name = getAdminUser()?.name || getAdminUser()?.fullName || "Admin";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ov, att, feeList, users] = await Promise.all([
          api<Overview>("/reports/overview"),
          api<AttendanceRow[]>("/attendance"),
          api<FeeRow[]>("/fees"),
          api<{ items: UserRow[] }>("/users?pageSize=24"),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setAttendance(att.slice(0, 6));
        setFees(feeList.filter((f) => f.status !== "PAID").slice(0, 5));
        setPeople(users.items);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Welcome, {name}</h2>
            <p className="text-sm text-slate-500">
              Track students, teachers &amp; staff — tap a person for full details
            </p>
          </div>
          <Badge variant="default">{unread} unread</Badge>
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
                  {f.courseTitle} · Rs {f.amount.toLocaleString()}
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
