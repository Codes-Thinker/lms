"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Report = {
  user: {
    id: string;
    fullName: string;
    email: string;
    accountType: string;
    track?: string | null;
    department?: string | null;
    batch?: string | null;
  };
  attendancePercent: number;
  feesPending: number;
  feesPaid: number;
  courses: Array<{
    id: string;
    title: string;
    batch?: string | null;
    progressPercent: number;
    feeStatus?: string | null;
    paidAmount: number;
    totalFee: number;
  }>;
  recentAttendance: Array<{
    date: string;
    status: string;
    courseTitle?: string | null;
  }>;
  fees: Array<{
    id: string;
    courseTitle: string;
    month: string;
    amount: number;
    status: string;
    dueDate: string;
  }>;
};

export default function StudentReportPage() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    api<Report>(`/reports/users/${params.id}`)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [params?.id]);

  if (error) {
    return (
      <div className="glass-card space-y-3 p-5">
        <p className="text-red-600">{error}</p>
        <Button asChild variant="secondary">
          <Link href="/students">Back</Link>
        </Button>
      </div>
    );
  }

  if (!report) {
    return <div className="p-5 text-sm text-slate-500">Loading report…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Student report
          </p>
          <h2 className="text-xl font-semibold">{report.user.fullName}</h2>
          <p className="text-sm text-slate-500">
            {report.user.email} · {report.user.track || "—"} · {report.user.batch || "—"}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/students">Back to students</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-5">
          <p className="text-sm text-slate-500">Attendance</p>
          <p className="mt-2 text-3xl font-semibold">{report.attendancePercent}%</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-slate-500">Fees pending</p>
          <p className="mt-2 text-3xl font-semibold">
            Rs {report.feesPending.toLocaleString()}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-sm text-slate-500">Fees paid</p>
          <p className="mt-2 text-3xl font-semibold">
            Rs {report.feesPaid.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="mb-4 font-semibold">Course progress</h3>
        <div className="space-y-4">
          {report.courses.map((c) => (
            <div key={c.id}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-slate-500">{c.batch}</p>
                </div>
                <Badge variant="secondary">{c.progressPercent}%</Badge>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${Math.min(100, c.progressPercent)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Paid Rs {c.paidAmount.toLocaleString()} / {c.totalFee.toLocaleString()} ·{" "}
                {c.feeStatus || "—"}
              </p>
            </div>
          ))}
          {report.courses.length === 0 ? (
            <p className="text-sm text-slate-500">No enrollments</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h3 className="mb-3 font-semibold">Recent attendance</h3>
          <ul className="space-y-2 text-sm">
            {report.recentAttendance.map((a, i) => (
              <li key={`${a.date}-${i}`} className="flex justify-between border-t border-slate-100 pt-2">
                <span>
                  {a.date} · {a.courseTitle || "—"}
                </span>
                <span className="font-medium">{a.status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card p-5">
          <h3 className="mb-3 font-semibold">Fee history</h3>
          <ul className="space-y-2 text-sm">
            {report.fees.map((f) => (
              <li key={f.id} className="flex justify-between border-t border-slate-100 pt-2">
                <span>
                  {f.month} · {f.courseTitle}
                </span>
                <span className="font-medium">
                  Rs {f.amount.toLocaleString()} · {f.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
