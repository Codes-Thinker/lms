"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, FileText, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchParamsBoundary } from "@/components/ui/search-params-boundary";
import { cn } from "@/lib/utils";

type CourseTab = {
  id: string;
  title: string;
  category: string;
  enrolledCount: number;
  published?: boolean;
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
  batch?: string | null;
  attendancePercent?: number | null;
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

type RangeMode = "day" | "7d" | "30d";

function karachiToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysKey(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

function fmtTime(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusVariant(status: string) {
  const s = status.toUpperCase();
  if (s === "LATE") return "warning" as const;
  if (s === "ABSENT") return "danger" as const;
  if (s === "LEAVE") return "info" as const;
  if (s === "CHECKED_OUT") return "secondary" as const;
  if (s === "PRESENT") return "success" as const;
  return "secondary" as const;
}

function downloadCsv(filename: string, rows: Row[]) {
  const header = [
    "Person",
    "Role",
    "Date",
    "Course",
    "Batch",
    "Status",
    "Check in",
    "Check out",
    "Office time",
    "Note",
  ];
  const lines = rows.map((r) => {
    const course =
      r.courseTitle || r.courses?.map((c) => c.title).join("; ") || "";
    const cells = [
      r.personName,
      r.role,
      r.date,
      course,
      r.batch ?? "",
      r.status,
      r.checkInAt ? new Date(r.checkInAt).toISOString() : "",
      r.checkOutAt ? new Date(r.checkOutAt).toISOString() : "",
      r.durationLabel ?? "",
      r.note ?? "",
    ];
    return cells
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(",");
  });
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AttendancePageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialDate = searchParams.get("date") ?? karachiToday();
  const initialCourse = searchParams.get("course") ?? "all";
  const initialQ = searchParams.get("q") ?? "";
  const initialRange = (searchParams.get("range") as RangeMode) || "day";

  const [board, setBoard] = useState<Board | null>(null);
  const [courseId, setCourseId] = useState<string>(initialCourse);
  const [date, setDate] = useState(initialDate);
  const [range, setRange] = useState<RangeMode>(
    initialRange === "7d" || initialRange === "30d" ? initialRange : "day"
  );
  const [nameQuery, setNameQuery] = useState(initialQ);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const syncUrl = useCallback(
    (next: { course?: string; date?: string; q?: string; range?: RangeMode }) => {
      const params = new URLSearchParams();
      const c = next.course ?? courseId;
      const d = next.date ?? date;
      const q = next.q ?? nameQuery;
      const r = next.range ?? range;
      if (c !== "all") params.set("course", c);
      if (d) params.set("date", d);
      if (q.trim()) params.set("q", q.trim());
      if (r !== "day") params.set("range", r);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [courseId, date, nameQuery, pathname, range, router]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (range === "day") {
        const q = new URLSearchParams({ date });
        if (courseId !== "all") q.set("courseId", courseId);
        const data = await api<Board>(`/attendance/board?${q.toString()}`);
        setBoard(data);
      } else {
        const end = date;
        const start = addDaysKey(date, range === "7d" ? -6 : -29);
        const q = new URLSearchParams({
          startDate: start,
          endDate: end,
        });
        if (courseId !== "all") q.set("courseId", courseId);
        const rows = await api<Row[]>(`/attendance?${q.toString()}`);
        const dayBoard = await api<Board>(
          `/attendance/board?date=${encodeURIComponent(end)}`
        );
        setBoard({
          date: `${start} → ${end}`,
          courses: dayBoard.courses,
          rows,
        });
      }
      setError(null);
      setLive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [courseId, date, range]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    function onFocus() {
      void load();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const tabs = useMemo(() => {
    const list = board?.courses ?? [];
    return [{ id: "all", title: "All", category: "", enrolledCount: 0 }, ...list];
  }, [board?.courses]);

  const allRows = board?.rows ?? [];

  const rows = useMemo(() => {
    const needle = nameQuery.trim().toLowerCase();
    if (!needle) return allRows;
    return allRows.filter((r) => r.personName.toLowerCase().includes(needle));
  }, [allRows, nameQuery]);

  const present = rows.filter((r) => r.status !== "ABSENT").length;
  const absent = rows.filter((r) => r.status === "ABSENT").length;
  const late = rows.filter((r) => r.status === "LATE").length;

  const exportName = `attendance-${range === "day" ? date : board?.date?.replace(/\s/g, "") || date}.csv`;

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5 print:border print:shadow-none">
        <div>
          <h2 className="text-lg font-semibold">Attendance</h2>
          <p className="text-sm text-slate-500">
            App check-in / out · saved in database · live refresh every 15s
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Data lives in Postgres (server <code className="rounded bg-slate-100 px-1">DATABASE_URL</code>
            ). Office pin / shifts:{" "}
            <Link href="/system" className="font-medium text-blue-600 hover:underline">
              Settings
            </Link>
            .
          </p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {(
              [
                ["day", "Day"],
                ["7d", "7 days"],
                ["30d", "30 days"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setRange(id);
                  syncUrl({ range: id });
                }}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-semibold transition",
                  range === id
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Input
            value={nameQuery}
            onChange={(e) => {
              const v = e.target.value;
              setNameQuery(v);
              syncUrl({ q: v });
            }}
            placeholder="Search by name…"
            className="h-9 w-[min(100%,200px)] rounded-lg"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => {
              const v = e.target.value;
              setDate(v);
              syncUrl({ date: v });
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            title={range === "day" ? "Day" : "Range end date"}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={rows.length === 0}
            onClick={() => downloadCsv(exportName, rows)}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={rows.length === 0}
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            PDF / Print
          </Button>
          <Badge variant={live ? "success" : "secondary"}>
            {live ? "Live" : "Connecting"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        {tabs.map((t) => {
          const active = courseId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setCourseId(t.id);
                syncUrl({ course: t.id });
              }}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                active
                  ? "bg-[#2563EB] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {t.title}
              {t.id !== "all" ? (
                <span
                  className={cn(
                    "ml-1.5 text-xs",
                    active ? "text-blue-100" : "text-slate-400"
                  )}
                >
                  {t.enrolledCount}
                  {t.published === false ? ", draft" : ""}
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

      <div className="glass-card table-scroll overflow-hidden print:border print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
          <span>
            Showing {rows.length} row{rows.length === 1 ? "" : "s"}
            {board?.date ? ` · ${board.date}` : ""}
            {loading ? " · refreshing…" : ""}
          </span>
          <span className="inline-flex items-center gap-1 print:hidden">
            <FileText className="h-3.5 w-3.5" />
            Export uses current filters
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Course</th>
              <th className="px-4 py-3 font-medium">Batch</th>
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
                "-";
              const pct =
                r.attendancePercent != null && !Number.isNaN(r.attendancePercent)
                  ? r.attendancePercent
                  : null;
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
                    {pct != null ? (
                      <p className="text-[11px] text-slate-400">
                        Roll {pct}%
                      </p>
                    ) : null}
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
                  <td className="px-4 py-3.5 text-slate-600">
                    {r.batch?.trim() ? r.batch : "-"}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={statusVariant(r.status)}>
                      {r.status}
                      {r.autoCheckout ? ", auto" : ""}
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
                      <span className="text-slate-400">-</span>
                    )}
                    {r.stillInOffice ? (
                      <span className="ml-1 text-[11px] text-blue-600">live</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {r.note || "-"}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  {nameQuery.trim()
                    ? "No people match this search"
                    : courseId !== "all" && range === "day"
                      ? "No students enrolled in this course"
                      : (
                          <div className="space-y-2">
                            <p>No attendance marks for this date / range yet.</p>
                            <p className="text-xs text-slate-400">
                              Marks appear when staff/students check in from the app.
                              Try <strong>7 days</strong> / <strong>30 days</strong>,
                              or pick an older date — older records stay saved in the DB.
                            </p>
                          </div>
                        )}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <SearchParamsBoundary>
      <AttendancePageInner />
    </SearchParamsBoundary>
  );
}
