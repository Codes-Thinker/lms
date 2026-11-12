"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { roleLabel } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";

type Report = {
  user: {
    id: string;
    fullName: string;
    email: string;
    accountType: string;
    status?: string;
    track?: string | null;
    designation?: string | null;
    department?: string | null;
    batch?: string | null;
    phone?: string | null;
    lastLoginAt?: string | null;
    createdAt?: string;
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
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    audience?: string;
    dueAt?: string | null;
  }>;
};

export default function UserProfilePage() {
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
          <Link href="/users">Back to users</Link>
        </Button>
      </div>
    );
  }

  if (!report) {
    return <div className="p-5 text-sm text-slate-500">Loading profile…</div>;
  }

  const u = report.user;
  const isStudent = u.accountType === "STUDENT";
  const isTeacher = u.accountType === "STAFF";
  const isIntern = u.accountType === "INTERN";
  const backHref = isStudent
    ? "/students"
    : isTeacher
      ? "/staff"
      : isIntern
        ? "/interns"
        : "/users";

  return (
    <div className="space-y-6">
      <div className="glass-card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-4">
          <UserAvatar
            name={u.fullName}
            email={u.email}
            accountType={u.accountType}
            size="lg"
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {roleLabel(u.accountType)} profile
            </p>
            <h1 className="text-xl font-semibold text-slate-900">{u.fullName}</h1>
            <p className="text-sm text-slate-500">{u.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{roleLabel(u.accountType)}</Badge>
              {u.status ? <Badge variant="outline">{u.status}</Badge> : null}
              {u.track ? <Badge variant="outline">{u.track}</Badge> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isStudent ? (
            <Button asChild variant="secondary" size="sm">
              <Link href="/fees">Student fees</Link>
            </Button>
          ) : null}
          <Button asChild variant="secondary" size="sm">
            <Link href={backHref}>Back</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Attendance" value={`${report.attendancePercent}%`} />
        {isStudent ? (
          <>
            <Stat
              label="Fees pending"
              value={`Rs ${report.feesPending.toLocaleString()}`}
            />
            <Stat
              label="Fees paid"
              value={`Rs ${report.feesPaid.toLocaleString()}`}
            />
            <Stat label="Courses" value={String(report.courses.length)} />
          </>
        ) : (
          <>
            <Stat label="Open / tasks" value={String(report.tasks?.length ?? 0)} />
            <Stat label="Department" value={u.department || "—"} />
            <Stat label="Phone" value={u.phone || "—"} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h3 className="mb-3 font-semibold">Details</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Role" value={roleLabel(u.accountType)} />
            <Row label="Email" value={u.email} />
            <Row label="Phone" value={u.phone || "—"} />
            <Row label="Track" value={u.track || "—"} />
            <Row label="Designation" value={u.designation || "—"} />
            <Row label="Department" value={u.department || "—"} />
            <Row label="Batch" value={u.batch || "—"} />
            <Row
              label="Last login"
              value={
                u.lastLoginAt
                  ? new Date(u.lastLoginAt).toLocaleString()
                  : "Never"
              }
            />
            <Row
              label="Joined"
              value={
                u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"
              }
            />
          </dl>
        </div>

        <div className="glass-card p-5">
          <h3 className="mb-3 font-semibold">Recent attendance</h3>
          <ul className="space-y-2 text-sm">
            {report.recentAttendance.map((a, i) => (
              <li
                key={`${a.date}-${i}`}
                className="flex justify-between border-t border-slate-100 pt-2 first:border-0 first:pt-0"
              >
                <span>
                  {a.date}
                  {a.courseTitle ? ` · ${a.courseTitle}` : ""}
                </span>
                <span className="font-medium">{a.status}</span>
              </li>
            ))}
            {report.recentAttendance.length === 0 ? (
              <li className="text-slate-500">No attendance yet</li>
            ) : null}
          </ul>
        </div>
      </div>

      {isStudent ? (
        <>
          <div className="glass-card p-5">
            <h3 className="mb-3 font-semibold">Courses</h3>
            <ul className="space-y-2 text-sm">
              {report.courses.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0"
                >
                  <span>
                    {c.title}
                    {c.batch ? ` · ${c.batch}` : ""}
                  </span>
                  <span className="font-medium">
                    {c.progressPercent}% · {c.feeStatus || "—"}
                  </span>
                </li>
              ))}
              {report.courses.length === 0 ? (
                <li className="text-slate-500">No enrollments</li>
              ) : null}
            </ul>
          </div>
          <div className="glass-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Fee history</h3>
              <Link href="/fees" className="text-sm text-blue-600 hover:underline">
                Open fees module
              </Link>
            </div>
            <ul className="space-y-2 text-sm">
              {report.fees.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0"
                >
                  <span>
                    {f.courseTitle} · {f.month}
                  </span>
                  <span className="font-medium">
                    Rs {f.amount.toLocaleString()} · {f.status}
                  </span>
                </li>
              ))}
              {report.fees.length === 0 ? (
                <li className="text-slate-500">No fee cases</li>
              ) : null}
            </ul>
          </div>
        </>
      ) : (
        <div className="glass-card p-5">
          <h3 className="mb-3 font-semibold">
            {isIntern ? "Projects / tasks" : "Assigned tasks"}
          </h3>
          <ul className="space-y-2 text-sm">
            {(report.tasks || []).map((t) => (
              <li
                key={t.id}
                className="flex justify-between border-t border-slate-100 pt-2 first:border-0 first:pt-0"
              >
                <span>{t.title}</span>
                <span className="font-medium">{t.status}</span>
              </li>
            ))}
            {(report.tasks || []).length === 0 ? (
              <li className="text-slate-500">No tasks yet</li>
            ) : null}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-slate-100 pt-2 first:border-0 first:pt-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
