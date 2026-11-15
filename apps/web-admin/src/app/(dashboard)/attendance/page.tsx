"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CourseTab = {
  id: string;
  title: string;
  category: string;
  enrolledCount: number;
};

type Row = {
  id: string;
  personId: string;
  personName: string;
  role: string;
  date: string;
  status: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  courseId?: string | null;
  courseTitle?: string | null;
  courses?: { id: string; title: string; category: string }[];
  durationMinutes?: number | null;
  durationLabel?: string | null;
  note?: string | null;
  autoCheckout?: boolean;
  stillInOffice?: boolean;
  source?: string;
};

type Board = {
  date: string;
  courses: CourseTab[];
  rows: Row[];
};

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusVariant(status: string) {
  const s = status.toUpperCase();
  if (s === "LATE") return "warning" as const;
  if (s === "ABSENT") return "danger" as const;
  if (s === "CHECKED_OUT") return "secondary" as const;
  if (s === "PRESENT") return "success" as const;
  return "secondary" as const;
}

export default function AttendancePage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [courseId, setCourseId] = useState<string>("all");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams({ date });
      if (courseId !== "all") q.set("courseId", courseId);
      const data = await api<Board>(`/attendance/board?${q.toString()}`);
      setBoard(data);
      setError(null);
      setLive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }, [courseId, date]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(id);
  }, [load]);

  const tabs = useMemo(() => {
    const list = board?.courses ?? [];
    return [{ id: "all", title: "All", category: "", enrolledCount: 0 }, ...list];
  }, [board?.courses]);

  const rows = board?.rows ?? [];
  const present = rows.filter((r) => r.status !== "ABSENT").length;
  const absent = rows.filter((r) => r.status === "ABSENT").length;
  const late = rows.filter((r) => r.status === "LATE").length;

  return (
    <div className="space-y-6">
      <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-semibold">Attendance</h2>
          <p className="text-sm text-slate-500">
            App check-in / out · course tabs · office time (hours &amp; minutes)
          </p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          />
          <Badge variant={live ? "success" : "secondary"}>
            {live ? "Live" : "Connecting"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = courseId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setCourseId(t.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                active
                  ? "bg-[#2563EB] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {t.title}
              {t.id !== "all" ? (
                <span className={cn("ml-1.5 text-xs", active ? "text-blue-100" : "text-slate-400")}>
                  {t.enrolledCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-slate-400">Marked / present</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{present}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-slate-400">Late</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{late}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-slate-400">Absent</p>
          <p className="mt-1 text-2xl font-semibold text-rose-600">{absent}</p>
        </div>
      </div>

      <div className="glass-card table-scroll overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Course</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Check in</th>
              <th className="px-4 py-3 font-medium">Check out</th>
              <th className="px-4 py-3 font-medium">Office time</th>
              <th className="px-4 py-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const courseLabel =
                r.courseTitle ||
                r.courses?.map((c) => c.title).join(", ") ||
                "—";
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/users/${r.personId}`}
                      className="font-semibold text-slate-900 hover:text-blue-700"
                    >
                      {r.personName}
                    </Link>
                    <p className="text-xs text-slate-500">{r.role}</p>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">{r.date}</td>
                  <td className="px-4 py-3.5">
                    <p className="max-w-[200px] truncate font-medium text-slate-800">
                      {courseLabel}
                    </p>
                    {r.courses && r.courses.length > 1 ? (
                      <p className="text-[11px] text-slate-400">
                        {r.courses.length} enrollments
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={statusVariant(r.status)}>
                      {r.status}
                      {r.autoCheckout ? " · auto" : ""}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                    {fmtTime(r.checkInAt)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                    {fmtTime(r.checkOutAt)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {r.durationLabel ? (
                      <span className="font-semibold text-slate-900">
                        {r.durationLabel}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                    {r.stillInOffice ? (
                      <span className="ml-1 text-[11px] text-blue-600">live</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {r.note || "—"}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  {courseId === "all"
                    ? "No attendance marks for this date yet"
                    : "No students enrolled in this course"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
