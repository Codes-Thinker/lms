"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { readListCache, writeListCache } from "@/lib/list-cache";
import { FeeStatusBadge } from "@/lib/fee-display";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSnackbar } from "@/components/ui/snackbar";
import { UserAvatar } from "@/components/ui/user-avatar";

const CACHE_KEY = "lms_cache_students_v2";
const PAGE_SIZE = 25;

type CourseTab = {
  id: string;
  title: string;
  category?: string;
};

type CourseEnr = {
  id: string;
  title: string;
  batch?: string | null;
  enrolledAt?: string;
  progressPercent?: number;
  feeStatus?: string | null;
};

type StudentRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  track?: string | null;
  batch?: string | null;
  batchName?: string | null;
  status: string;
  progressPercent: number;
  courses: CourseEnr[];
};

type StudentsCache = {
  courses: CourseTab[];
  list: StudentRow[];
};

function accountStatusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return <Badge variant="success">{status}</Badge>;
  if (s === "INVITED" || s === "PENDING") return <Badge variant="warning">{status}</Badge>;
  if (s === "SUSPENDED" || s === "INACTIVE") return <Badge variant="danger">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function tabLabel(c: CourseTab) {
  return c.title?.trim() || c.category?.trim() || "Course";
}

function mapStudent(u: Record<string, unknown>): StudentRow {
  const courses = ((u.courses as CourseEnr[] | undefined) ?? []).map((c) => ({
    id: String(c.id),
    title: String(c.title),
    batch: c.batch ?? null,
    enrolledAt: c.enrolledAt,
    progressPercent: c.progressPercent ?? 0,
    feeStatus: c.feeStatus ?? null,
  }));
  return {
    id: String(u.id),
    name: String(u.name || u.fullName || ""),
    email: String(u.email || ""),
    phone: (u.phone as string) || null,
    track: (u.track as string) || null,
    batch:
      typeof u.batch === "string"
        ? u.batch
        : ((u.batch as { code?: string } | null)?.code ?? null),
    batchName: (u.batchName as string) || null,
    status: String(u.status || "—"),
    progressPercent: Number(u.progressPercent ?? 0),
    courses,
  };
}

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { show } = useSnackbar();

  const courseParam = searchParams.get("course") ?? "all";
  const qFromUrl = searchParams.get("q") ?? "";

  const [courses, setCourses] = useState<CourseTab[]>([]);
  const [list, setList] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(qFromUrl);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const replaceQuery = useCallback(
    (next: { course?: string; q?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.course !== undefined) {
        if (next.course === "all") params.delete("course");
        else params.set("course", next.course);
      }
      if (next.q !== undefined) {
        if (!next.q.trim()) params.delete("q");
        else params.set("q", next.q.trim());
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    setSearchInput(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (searchInput.trim() !== qFromUrl.trim()) {
        setPage(1);
        replaceQuery({ q: searchInput });
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput, qFromUrl, replaceQuery]);

  const fetchStudents = useCallback(async () => {
    setError(null);
    const courseId = courseParam === "all" ? "" : courseParam;
    const q = qFromUrl.trim();
    const params = new URLSearchParams({
      accountType: "STUDENT",
      pageSize: String(PAGE_SIZE),
      page: String(page),
    });
    if (q) params.set("q", q);
    if (courseId) params.set("courseId", courseId);

    const [courseList, users] = await Promise.all([
      api<CourseTab[]>("/courses?all=1"),
      api<{ items: Array<Record<string, unknown>>; total?: number }>(
        `/users?${params.toString()}`
      ),
    ]);
    const students = users.items.map(mapStudent);
    setCourses(courseList);
    setList(students);
    setTotal(users.total ?? students.length);
    writeListCache<StudentsCache>(CACHE_KEY, {
      courses: courseList,
      list: students,
    });
  }, [courseParam, page, qFromUrl]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchStudents();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Load failed";
      setError(msg);
      show(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [fetchStudents, show]);

  useEffect(() => {
    const cached = readListCache<StudentsCache>(CACHE_KEY);
    if (cached) {
      setCourses(cached.courses);
      setList(cached.list);
      setLoading(false);
    }
  }, []);

  const filterRef = useRef({ course: courseParam, q: qFromUrl });

  useEffect(() => {
    const filterChanged =
      filterRef.current.course !== courseParam ||
      filterRef.current.q !== qFromUrl;
    filterRef.current = { course: courseParam, q: qFromUrl };
    if (filterChanged && page !== 1) {
      setPage(1);
      return;
    }
    void refresh();
  }, [courseParam, page, qFromUrl, refresh]);

  const tabs = useMemo(
    () => [{ id: "all", title: "All Students", category: "" }, ...courses],
    [courses]
  );

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function selectCourse(id: string) {
    setPage(1);
    replaceQuery({ course: id });
  }

  const feesHref =
    courseParam === "all" ? "/fees" : `/fees?course=${encodeURIComponent(courseParam)}`;

  return (
    <div className="space-y-6">
      <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-semibold">Students</h2>
          <p className="text-sm text-slate-500">
            Roster by course · profiles at{" "}
            <span className="font-medium text-slate-700">/users/:id</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" asChild>
            <Link href={feesHref}>Open fees</Link>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={loading}
            onClick={() => refresh().catch((e) => show(String(e)))}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="glass-card border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="glass-card space-y-4 p-5">
        <Input
          placeholder="Search name, email, or phone…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = courseParam === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectCourse(t.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-[#2563EB] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {t.id === "all" ? t.title : tabLabel(t)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-card table-scroll overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold">Student roster</h3>
          <p className="text-xs text-slate-500">
            {loading ? "Loading…" : `${total} student${total === 1 ? "" : "s"}`}
            {qFromUrl ? ` · matching “${qFromUrl}”` : null}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Student ID</th>
                <th className="px-5 py-3 font-medium">Course(s)</th>
                <th className="px-5 py-3 font-medium">Batch</th>
                <th className="px-5 py-3 font-medium">Enrolled</th>
                <th className="px-5 py-3 font-medium">Progress</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    Loading students…
                  </td>
                </tr>
              ) : null}
              {!loading && list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    No students match this filter
                  </td>
                </tr>
              ) : null}
              {list.map((s) => {
                const courseTitles =
                  s.courses.map((c) => c.title).join(", ") || "—";
                const batchLabel =
                  [s.batch, s.batchName].filter(Boolean).join(" · ") || "—";
                const enrolled = s.courses.length > 0;
                const open = expandedId === s.id;
                return (
                  <Fragment key={s.id}>
                    <tr
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50/60"
                      onClick={() => setExpandedId(open ? null : s.id)}
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/users/${s.id}`}
                          className="flex items-center gap-2.5 hover:text-blue-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <UserAvatar
                            name={s.name}
                            email={s.email}
                            accountType="STUDENT"
                            size="sm"
                          />
                          <span className="font-semibold">{s.name}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-slate-600">{s.email}</p>
                        <p className="text-xs text-slate-500">{s.phone || "—"}</p>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                        {shortId(s.id)}
                      </td>
                      <td
                        className="max-w-[200px] truncate px-5 py-3.5"
                        title={courseTitles}
                      >
                        {courseTitles}
                      </td>
                      <td className="px-5 py-3.5">
                        <p>{batchLabel}</p>
                        {s.track ? (
                          <p className="text-xs text-slate-500">{s.track}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">
                        {enrolled ? (
                          <Badge variant="success">Enrolled</Badge>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium">
                        {s.progressPercent}%
                      </td>
                      <td className="px-5 py-3.5">{accountStatusBadge(s.status)}</td>
                    </tr>
                    {open ? (
                      <tr className="border-t border-slate-100 bg-blue-50/30">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-2 text-sm">
                              <p className="font-medium text-slate-700">
                                Course breakdown
                              </p>
                              {s.courses.length === 0 ? (
                                <p className="text-slate-500">No enrollments</p>
                              ) : (
                                <ul className="space-y-2">
                                  {s.courses.map((c) => (
                                    <li
                                      key={c.id}
                                      className="flex flex-wrap items-center gap-2 text-slate-600"
                                    >
                                      <span>
                                        {c.title}
                                        {c.batch ? ` · ${c.batch}` : ""} —{" "}
                                        {c.progressPercent ?? 0}%
                                        {c.enrolledAt
                                          ? ` · from ${c.enrolledAt}`
                                          : ""}
                                      </span>
                                      {c.feeStatus ? (
                                        <FeeStatusBadge status={c.feeStatus} />
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <Button size="sm" variant="secondary" asChild>
                              <Link href={`/users/${s.id}`}>Full profile</Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {pageCount > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-500">
              Page {page} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= pageCount || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}