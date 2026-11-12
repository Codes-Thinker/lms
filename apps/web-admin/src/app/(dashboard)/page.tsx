"use client";

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
import { Button } from "@/components/ui/button";
import {
  attendanceRecords,
  dashboardMetrics,
  feeRecords,
  internProjects,
  staffTasks,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/components/ui/notifications-provider";
import { useSnackbar } from "@/components/ui/snackbar";

const kpis = [
  {
    label: "Students",
    value: dashboardMetrics.students.toString(),
    href: "/students",
    icon: GraduationCap,
    tone: "bg-blue-50 text-blue-600",
  },
  {
    label: "Interns",
    value: dashboardMetrics.interns.toString(),
    href: "/interns",
    icon: FolderKanban,
    tone: "bg-sky-50 text-sky-600",
  },
  {
    label: "Staff",
    value: dashboardMetrics.staff.toString(),
    href: "/staff",
    icon: BriefcaseBusiness,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "Attendance today",
    value: `${dashboardMetrics.attendanceTodayPercent}%`,
    href: "/attendance",
    icon: CalendarCheck,
    tone: "bg-amber-50 text-amber-600",
  },
];

export default function DashboardPage() {
  const { unread } = useNotifications();
  const { show } = useSnackbar();

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Welcome, Ayaz Aslam</h2>
            <p className="text-sm text-slate-500">
              Students · Interns · Staff — live attendance & activity from the app
            </p>
          </div>
          <button type="button" onClick={() => show("Open the bell for notification count")}>
            <Badge variant="default">{unread} unread</Badge>
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className={cn("glass-card animate-fade-up block p-5", `stagger-${index + 1}`)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{kpi.label}</p>
                  <p className="mt-2 text-3xl font-bold">{kpi.value}</p>
                </div>
                <div className={cn("rounded-2xl p-3", kpi.tone)}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Fees pending</h3>
            <Wallet className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-amber-600">
            Rs {dashboardMetrics.feesPending.toLocaleString()}
          </p>
          <div className="mt-3 space-y-2">
            {feeRecords
              .filter((f) => f.status !== "PAID")
              .map((f) => (
                <div key={f.id} className="flex justify-between text-sm">
                  <span>{f.studentName}</span>
                  <span className="font-medium">Rs {f.amount.toLocaleString()}</span>
                </div>
              ))}
          </div>
          <Button asChild className="mt-4 w-full" variant="secondary">
            <Link href="/students">Student fees & reports</Link>
          </Button>
        </div>

        <div className="glass-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Staff tasks</h3>
            <ListTodo className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold">{dashboardMetrics.openStaffTasks} open</p>
          <div className="mt-3 space-y-2">
            {staffTasks.slice(0, 3).map((t) => (
              <div key={t.id} className="text-sm">
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-slate-500">→ {t.assignedToName}</p>
              </div>
            ))}
          </div>
          <Button asChild className="mt-4 w-full" variant="secondary">
            <Link href="/staff">Assign staff task</Link>
          </Button>
        </div>

        <div className="glass-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Intern projects</h3>
            <FolderKanban className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold">{dashboardMetrics.openInternProjects} open</p>
          <div className="mt-3 space-y-2">
            {internProjects.slice(0, 3).map((p) => (
              <div key={p.id} className="text-sm">
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-slate-500">
                  {p.internName} · {p.progressPercent}%
                </p>
              </div>
            ))}
          </div>
          <Button asChild className="mt-4 w-full" variant="secondary">
            <Link href="/interns">Assign intern project</Link>
          </Button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold">Live attendance from APP</h3>
          <p className="text-sm text-slate-500">
            Check-in / check-out · who came · when left
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Person</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Check in</th>
                <th className="px-5 py-3 font-medium">Check out</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium">{row.personName}</td>
                  <td className="px-5 py-3">
                    <Badge variant="secondary">{row.role}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      variant={
                        row.status === "PRESENT" || row.status === "CHECKED_OUT"
                          ? "success"
                          : row.status === "LATE"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {row.checkOutAt ? "OUT" : row.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {new Date(row.checkInAt).toLocaleTimeString()}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {row.checkOutAt
                      ? new Date(row.checkOutAt).toLocaleTimeString()
                      : "Still in"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
