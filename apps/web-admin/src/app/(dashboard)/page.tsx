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
import { api, getAdminUser } from "@/lib/api";
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
  studentName: string;
  courseTitle: string;
  amount: number;
  status: string;
};

export default function DashboardPage() {
  const { unread } = useNotifications();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const name = getAdminUser()?.name || getAdminUser()?.fullName || "Admin";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ov, att, feeList] = await Promise.all([
          api<Overview>("/reports/overview"),
          api<AttendanceRow[]>("/attendance"),
          api<FeeRow[]>("/fees"),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setAttendance(att.slice(0, 6));
        setFees(feeList.filter((f) => f.status !== "PAID").slice(0, 5));
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
      label: "Staff",
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
              Live overview
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold">Fees pending</h3>
          </div>
          <p className="mb-3 text-2xl font-semibold">
            Rs {(overview?.feesPending ?? 0).toLocaleString()}
          </p>
          <ul className="space-y-2 text-sm">
            {fees.map((f) => (
              <li key={f.id} className="flex justify-between border-t border-slate-100 pt-2">
                <span>
                  {f.studentName} · {f.courseTitle}
                </span>
                <span className="font-medium">Rs {f.amount.toLocaleString()}</span>
              </li>
            ))}
            {fees.length === 0 ? (
              <li className="text-slate-500">No pending fees</li>
            ) : null}
          </ul>
        </div>

        <div className="glass-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold">Today attendance</h3>
          </div>
          <p className="mb-3 text-sm text-slate-500">
            Open tasks {overview?.openStaffTasks ?? 0} · Intern projects{" "}
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
