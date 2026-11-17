"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { readListCache, writeListCache } from "@/lib/list-cache";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/components/ui/snackbar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SearchParamsBoundary } from "@/components/ui/search-params-boundary";

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

type TaskChat = {
  id: string;
  senderName: string;
  senderRole: string;
  text: string;
  sentAt: string;
};

type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  assignedBy?: string | null;
  courseTitle?: string | null;
  audience?: string | null;
  status: string;
  dueAt?: string | null;
  spentMinutes?: number;
  timerMinutes?: number;
  chat?: TaskChat[];
};

function taskDetailLine(t: TaskRow) {
  const parts: string[] = [];
  if (t.assignedBy?.trim()) parts.push(`from ${t.assignedBy}`);
  if (t.assignedToName?.trim()) parts.push(`→ ${t.assignedToName}`);
  if (t.courseTitle?.trim()) parts.push(`, ${t.courseTitle}`);
  if (typeof t.spentMinutes === "number") parts.push(`, ${t.spentMinutes}m worked`);
  if (t.chat && t.chat.length > 0) parts.push(`, ${t.chat.length} chat`);
  if (t.dueAt) parts.push(`, due ${t.dueAt.slice(0, 10)}`);
  return parts.join(" ");
}

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
    status: String(u.status || "ACTIVE"),
    taughtCourses: taught,
  };
}

function StaffPageInner() {
  const { show } = useSnackbar();
  const searchParams = useSearchParams();
  const taskChatId = (searchParams.get("taskChat") || "").trim();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<TaskRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [chatTask, setChatTask] = useState<TaskRow | null>(null);
  const [chatText, setChatText] = useState("");

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

  const studentAssignments = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.audience === "STUDENT" ||
          (t.assignedToId != null && !staffIds.has(t.assignedToId))
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
    const id = window.setInterval(() => {
      refresh().catch(() => {});
    }, 15000);
    return () => window.clearInterval(id);
  }, [refresh, show]);

  // Deep-link from notification: /staff?taskChat=<id>
  useEffect(() => {
    if (!taskChatId || tasks.length === 0) return;
    const match = tasks.find((t) => t.id === taskChatId);
    if (match) {
      setChatTask(match);
      setChatText("");
    }
  }, [taskChatId, tasks]);

  async function saveEdit() {
    if (!editTask || !editTitle.trim()) return;
    setActingId(editTask.id);
    try {
      await api(`/tasks/${editTask.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
        }),
      });
      show("Assignment updated");
      setEditTask(null);
      await refresh();
    } catch (e) {
      show(e instanceof Error ? e.message : "Update failed");
    } finally {
      setActingId(null);
    }
  }

  async function removeTask(t: TaskRow) {
    if (!window.confirm(`Delete "${t.title}"? Student will be notified.`)) return;
    setActingId(t.id);
    try {
      await api(`/tasks/${t.id}`, { method: "DELETE" });
      show("Assignment deleted");
      await refresh();
    } catch (e) {
      show(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setActingId(null);
    }
  }

  async function sendTaskChat() {
    if (!chatTask || !chatText.trim()) return;
    setActingId(chatTask.id);
    try {
      await api(`/tasks/${chatTask.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: chatText.trim() }),
      });
      setChatText("");
      await refresh();
      const latest = (await api<TaskRow[]>(`/tasks`)).find((x) => x.id === chatTask.id);
      if (latest) setChatTask(latest);
    } catch (e) {
      show(e instanceof Error ? e.message : "Chat send failed");
    } finally {
      setActingId(null);
    }
  }

  function renderTaskActions(t: TaskRow) {
    const busy = actingId === t.id;
    return (
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{t.status}</Badge>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setChatTask(t);
            setChatText("");
          }}
        >
          Chat{(t.chat?.length ?? 0) > 0 ? ` (${t.chat!.length})` : ""}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setEditTask(t);
            setEditTitle(t.title);
            setEditDescription(t.description || "");
          }}
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void removeTask(t)}
        >
          Delete
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-semibold">Teachers</h2>
          <p className="text-sm text-slate-500">
            Teaching staff and live student assignments
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Set course instructor in{" "}
            <Link href="/courses" className="text-blue-600 hover:underline">
              Courses
            </Link>
            . Teachers create/edit/delete assignments from the app.
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
                  : "Not assigned";
              const trackLine =
                [s.track, s.designation].filter(Boolean).join(", ") || "Not set";
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
                    <p className="text-xs text-slate-500">
                      {s.phone?.trim() || "No phone"}
                    </p>
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
                  No teachers yet. Add from Users as Teacher.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="glass-card p-5">
        <h3 className="mb-1 font-semibold">Student assignments</h3>
        <p className="mb-3 text-xs text-slate-500">
          Live from teacher app. Edit or delete here too. Refreshes every 15s.
        </p>
        <ul className="space-y-2 text-sm">
          {studentAssignments.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-start justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0"
            >
              <span className="min-w-0">
                <span className="font-medium text-slate-900">{t.title}</span>
                {taskDetailLine(t) ? (
                  <span className="text-slate-500"> {taskDetailLine(t)}</span>
                ) : null}
              </span>
              {renderTaskActions(t)}
            </li>
          ))}
          {studentAssignments.length === 0 ? (
            <li className="text-slate-500">No student assignments yet</li>
          ) : null}
        </ul>
      </div>

      <div className="glass-card p-5">
        <h3 className="mb-3 font-semibold">Staff tasks</h3>
        <ul className="space-y-2 text-sm">
          {staffTasks.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-start justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0"
            >
              <span className="min-w-0">
                <span className="font-medium text-slate-900">{t.title}</span>
                {taskDetailLine(t) ? (
                  <span className="text-slate-500"> {taskDetailLine(t)}</span>
                ) : null}
              </span>
              {renderTaskActions(t)}
            </li>
          ))}
          {staffTasks.length === 0 ? (
            <li className="text-slate-500">No staff tasks</li>
          ) : null}
        </ul>
      </div>

      {editTask ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (actingId) return;
            setEditTask(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Edit assignment</h3>
            <p className="mt-1 text-sm text-slate-500">
              {editTask.assignedToName || "Assignee"}
            </p>
            <input
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title"
            />
            <textarea
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={4}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Instructions"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={actingId === editTask.id || !editTitle.trim()}
                onClick={() => void saveEdit()}
              >
                Save
              </Button>
              <Button
                variant="secondary"
                disabled={actingId === editTask.id}
                onClick={() => setEditTask(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {chatTask ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (actingId) return;
            setChatTask(null);
          }}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">{chatTask.title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {chatTask.assignedToName || "Student"}
              {typeof chatTask.spentMinutes === "number"
                ? `, ${chatTask.spentMinutes}m worked`
                : ""}
            </p>
            <div className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm">
              {(chatTask.chat || []).length === 0 ? (
                <p className="text-slate-500">No messages yet</p>
              ) : (
                (chatTask.chat || []).map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl px-3 py-2 ${
                      m.senderRole === "ADMIN"
                        ? "ml-6 bg-blue-600 text-white"
                        : "mr-6 bg-white text-slate-800"
                    }`}
                  >
                    <div className="text-[11px] opacity-70">
                      {m.senderName}, {m.sentAt.slice(11, 16) || m.sentAt}
                    </div>
                    <div>{m.text}</div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Reply to student…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void sendTaskChat();
                }}
              />
              <Button
                disabled={actingId === chatTask.id || !chatText.trim()}
                onClick={() => void sendTaskChat()}
              >
                Send
              </Button>
            </div>
            <Button
              className="mt-2"
              variant="secondary"
              disabled={actingId === chatTask.id}
              onClick={() => setChatTask(null)}
            >
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function StaffPage() {
  return (
    <SearchParamsBoundary>
      <StaffPageInner />
    </SearchParamsBoundary>
  );
}