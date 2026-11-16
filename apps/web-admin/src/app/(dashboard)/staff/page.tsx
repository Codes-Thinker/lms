"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { readListCache, writeListCache } from "@/lib/list-cache";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/components/ui/snackbar";
import { UserAvatar } from "@/components/ui/user-avatar";

const CACHE_KEY = "lms_cache_staff_v1";

type TaughtCourse = {
  id: string;
  title: string;
  batch?: string | null;
};

type StaffRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  track?: string | null;
  designation?: string | null;
  status: string;
  taughtCourses: TaughtCourse[];
};

type TaskRow = {
  id: string;
  title: string;
  assignedToId?: string | null;
  assignedToName?: string | null;
  audience?: string | null;
  status: string;
  dueAt?: string | null;
};

type StaffCache = {
  staff: StaffRow[];
  tasks: TaskRow[];
};

function accountStatusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return <Badge variant="success">{status}</Badge>;
  if (s === "INVITED" || s === "PENDING") return <Badge variant="warning">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function mapStaff(u: Record<string, unknown>): StaffRow {
  const taught = ((u.taughtCourses as TaughtCourse[] | undefined) ?? []).map((c) => ({
    id: String(c.id),
    title: String(c.title),
    batch: c.batch ?? null,
  }));
  return {
    id: String(u.id),
    name: String(u.name || u.fullName || ""),
    email: String(u.email || ""),
    phone: (u.phone as string) || null,
    track: (u.track as string) || null,
    designation: (u.designation as string) || null,
    status: String(u.status || "—"),
    taughtCourses: taught,
  };
}

export default function StaffPage() {
  const { show } = useSnackbar();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const staffIds = useMemo(() => new Set(staff.map((s) => s.id)), [staff]);

  const staffTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.audience === "STAFF" ||
          (t.assignedToId != null && staffIds.has(t.assignedToId))
      ),
    [tasks, staffIds]
  );

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [userRes, taskList] = await Promise.all([
        api<{ items: Array<Record<string, unknown>> }>(
          "/users?accountType=STAFF&pageSize=100"
        ),
        api<TaskRow[]>("/tasks"),
      ]);
      const rows = userRes.items.map(mapStaff);
      setStaff(rows);
      setTasks(taskList);
      writeListCache<StaffCache>(CACHE_KEY, { staff: rows, tasks: taskList });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = readListCache<StaffCache>(CACHE_KEY);
    if (cached) {
      setStaff(cached.staff);
      setTasks(cached.tasks);
      setLoading(false);
    }
    refresh().catch((e) => show(e instanceof Error ? e.message : "Load failed"));
  }, [refresh, show]);

  return (
    <div className="space-y-6">
      <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-semibold">Teachers</h2>
          <p className="text-sm text-slate-500">
            Teaching staff — open profile for full details
          </p>
          <p className="mt-1 text-xs text-slate-500">
            To assign courses to a teacher, edit the course and set the{" "}
            <span className="font-medium text-slate-700">instructor</span> field in{" "}
            <Link href="/courses" className="text-blue-600 hover:underline">
              Courses
            </Link>
            .
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={() => refresh().catch((e) => show(String(e)))}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error ? (
        <div className="glass-card border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="glass-card table-scroll overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email / Phone</th>
              <th className="px-5 py-3 font-medium">Track / Designation</th>
              <th className="px-5 py-3 font-medium">Taught courses</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const courseLine =
                s.taughtCourses.length > 0
                  ? s.taughtCourses
                      .map((c) => (c.batch ? `${c.title} (${c.batch})` : c.title))
                      .join(", ")
                  : "—";
              const trackLine = [s.track, s.designation].filter(Boolean).join(" · ") || "—";
              return (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/users/${s.id}`}
                      className="flex items-center gap-2.5 font-semibold hover:text-blue-700"
                    >
                      <UserAvatar
                        name={s.name}
                        email={s.email}
                        accountType="STAFF"
                        size="sm"
                      />
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs">{s.email}</p>
                    <p className="text-xs text-slate-500">{s.phone || "—"}</p>
                  </td>
                  <td className="px-5 py-3.5">{trackLine}</td>
                  <td
                    className="max-w-xs px-5 py-3.5 text-xs text-slate-600"
                    title={courseLine}
                  >
                    {courseLine}
                  </td>
                  <td className="px-5 py-3.5">{accountStatusBadge(s.status)}</td>
                </tr>
              );
            })}
            {staff.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  No teachers yet — add from Users as Teacher
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="glass-card p-5">
        <h3 className="mb-3 font-semibold">Staff tasks</h3>
        <p className="mb-3 text-xs text-slate-500">
          Tasks assigned to staff or with audience Staff. Admins can assign via POST{" "}
          <code className="rounded bg-slate-100 px-1">/tasks</code>.
        </p>
        <ul className="space-y-2 text-sm">
          {staffTasks.map((t) => (
            <li
              key={t.id}
              className="flex justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0"
            >
              <span>
                {t.title}
                {t.assignedToName ? ` · ${t.assignedToName}` : ""}
                {t.dueAt ? (
                  <span className="text-slate-500"> · due {t.dueAt.slice(0, 10)}</span>
                ) : null}
              </span>
              <Badge variant="secondary">{t.status}</Badge>
            </li>
          ))}
          {staffTasks.length === 0 ? (
            <li className="text-slate-500">No staff tasks</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}