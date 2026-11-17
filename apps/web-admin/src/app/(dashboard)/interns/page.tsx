"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { readListCache, writeListCache } from "@/lib/list-cache";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSnackbar } from "@/components/ui/snackbar";
import { UserAvatar } from "@/components/ui/user-avatar";

const CACHE_KEY = "lms_cache_interns_v1";

type Project = {
  id: string;
  title: string;
  description?: string | null;
  internId: string;
  internName: string;
  status: string;
  progressPercent: number;
  deadline?: string | null;
  techStack?: string | null;
};

type InternProject = {
  id: string;
  title: string;
  status: string;
  progressPercent: number;
};

type InternRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  track?: string | null;
  batch?: string | null;
  batchName?: string | null;
  status: string;
  internshipStart?: string | null;
  internshipEnd?: string | null;
  projects: InternProject[];
};

type TaskRow = {
  id: string;
  title: string;
  assignedToId?: string | null;
  assignedToName?: string | null;
  assignedBy?: string | null;
  courseTitle?: string | null;
  audience?: string | null;
  status: string;
  dueAt?: string | null;
};

function taskDetailLine(t: TaskRow) {
  const parts: string[] = [];
  if (t.assignedBy?.trim()) parts.push(`from ${t.assignedBy}`);
  if (t.assignedToName?.trim()) parts.push(`→ ${t.assignedToName}`);
  if (t.courseTitle?.trim()) parts.push(`, ${t.courseTitle}`);
  if (t.dueAt) parts.push(`, due ${t.dueAt.slice(0, 10)}`);
  return parts.join(" ");
}

type InternsCache = {
  interns: InternRow[];
  projects: Project[];
  tasks: TaskRow[];
};

const emptyProjectForm = {
  title: "",
  description: "",
  techStack: "",
  internId: "",
  deadline: "",
  progressPercent: "0",
};

function accountStatusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return <Badge variant="success">{status}</Badge>;
  if (s === "INVITED" || s === "PENDING") return <Badge variant="warning">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function mapIntern(u: Record<string, unknown>): InternRow {
  const projects = ((u.projects as InternProject[] | undefined) ?? []).map((p) => ({
    id: String(p.id),
    title: String(p.title),
    status: String(p.status),
    progressPercent: Number(p.progressPercent ?? 0),
  }));
  return {
    id: String(u.id),
    name: String(u.name || u.fullName || ""),
    email: String(u.email || ""),
    phone: (u.phone as string) || null,
    department: (u.department as string) || null,
    track: (u.track as string) || null,
    batch: typeof u.batch === "string" ? u.batch : null,
    batchName: (u.batchName as string) || null,
    status: String(u.status || "-"),
    internshipStart: (u.internshipStart as string) || null,
    internshipEnd: (u.internshipEnd as string) || null,
    projects,
  };
}

function internshipRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "-";
  if (start && end) return `${start} → ${end}`;
  return start || end || "-";
}

export default function InternsPage() {
  const { show } = useSnackbar();
  const [interns, setInterns] = useState<InternRow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);

  const internIds = useMemo(() => new Set(interns.map((i) => i.id)), [interns]);

  const internTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.audience === "INTERN" ||
          (t.assignedToId != null && internIds.has(t.assignedToId))
      ),
    [tasks, internIds]
  );

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [userRes, projectList, taskList] = await Promise.all([
        api<{ items: Array<Record<string, unknown>> }>(
          "/users?accountType=INTERN&pageSize=100"
        ),
        api<Project[]>("/projects"),
        api<TaskRow[]>("/tasks"),
      ]);
      const rows = userRes.items.map(mapIntern);
      setInterns(rows);
      setProjects(projectList);
      setTasks(taskList);
      writeListCache<InternsCache>(CACHE_KEY, {
        interns: rows,
        projects: projectList,
        tasks: taskList,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = readListCache<InternsCache>(CACHE_KEY);
    if (cached) {
      setInterns(cached.interns);
      setProjects(cached.projects);
      setTasks(cached.tasks);
      setLoading(false);
    }
    refresh().catch((e) => show(e instanceof Error ? e.message : "Load failed"));
  }, [refresh, show]);

  function projectSummaryFor(internId: string) {
    const fromUser = interns.find((i) => i.id === internId)?.projects ?? [];
    const fromApi = projects.filter((p) => p.internId === internId);
    const count = Math.max(fromUser.length, fromApi.length);
    const avg =
      fromApi.length > 0
        ? Math.round(
            fromApi.reduce((s, p) => s + p.progressPercent, 0) / fromApi.length
          )
        : fromUser.length > 0
          ? Math.round(
              fromUser.reduce((s, p) => s + p.progressPercent, 0) / fromUser.length
            )
          : 0;
    return { count, avg };
  }

  async function onCreateProject(e: FormEvent) {
    e.preventDefault();
    if (!projectForm.title.trim() || !projectForm.internId) {
      show("Title and intern are required", "error");
      return;
    }
    setSaving(true);
    try {
      const title = projectForm.title.trim();
      const listAfter = await api<Project[]>("/projects", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: projectForm.description.trim() || undefined,
          techStack: projectForm.techStack.trim() || undefined,
          internId: projectForm.internId,
          deadline: projectForm.deadline || undefined,
        }),
      });
      const pct = Math.min(100, Math.max(0, Number(projectForm.progressPercent) || 0));
      const created = listAfter.find(
        (p) => p.title === title && p.internId === projectForm.internId
      );
      if (pct > 0 && created?.id) {
        await api(`/projects/${created.id}`, {
          method: "PATCH",
          body: JSON.stringify({ progressPercent: pct }),
        });
      }
      setProjectForm(emptyProjectForm);
      show("Project assigned to intern");
      await refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not create project", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-semibold">Interns</h2>
          <p className="text-sm text-slate-500">
            Roster, internship window, projects and intern-facing tasks
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
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold">Intern roster</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email / Phone</th>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium">Track / Role</th>
                <th className="px-5 py-3 font-medium">Batch</th>
                <th className="px-5 py-3 font-medium">Internship</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Projects</th>
                <th className="px-5 py-3 font-medium">Chat</th>
              </tr>
            </thead>
            <tbody>
              {interns.length === 0 && !loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-500">
                    No interns yet
                  </td>
                </tr>
              ) : null}
              {interns.map((i) => {
                const { count, avg } = projectSummaryFor(i.id);
                const batch =
                  [i.batch, i.batchName].filter(Boolean).join(", ") || "-";
                return (
                  <tr key={i.id} className="border-t border-slate-100">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/users/${i.id}`}
                        className="flex items-center gap-2.5 font-semibold hover:text-blue-700"
                      >
                        <UserAvatar
                          name={i.name}
                          email={i.email}
                          accountType="INTERN"
                          size="sm"
                        />
                        {i.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs">{i.email}</p>
                      <p className="text-xs text-slate-500">{i.phone || "-"}</p>
                    </td>
                    <td className="px-5 py-3.5">{i.department || "-"}</td>
                    <td className="px-5 py-3.5">{i.track || "-"}</td>
                    <td className="px-5 py-3.5">{batch}</td>
                    <td className="px-5 py-3.5 text-xs">
                      {internshipRange(i.internshipStart, i.internshipEnd)}
                    </td>
                    <td className="px-5 py-3.5">{accountStatusBadge(i.status)}</td>
                    <td className="px-5 py-3.5">
                      {count ? (
                        <span>
                          {count}, avg {avg}%
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Button size="sm" variant="secondary" asChild>
                        <Link href={`/inbox?userId=${encodeURIComponent(i.id)}`}>
                          Chat
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card space-y-4 p-5">
        <h3 className="font-semibold">Assign new project</h3>
        <form
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          onSubmit={onCreateProject}
        >
          <div className="space-y-1.5 md:col-span-2 xl:col-span-1">
            <Label>Title</Label>
            <Input
              value={projectForm.title}
              onChange={(e) =>
                setProjectForm({ ...projectForm, title: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Description</Label>
            <Input
              value={projectForm.description}
              onChange={(e) =>
                setProjectForm({ ...projectForm, description: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tech stack</Label>
            <Input
              value={projectForm.techStack}
              onChange={(e) =>
                setProjectForm({ ...projectForm, techStack: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Intern</Label>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={projectForm.internId}
              onChange={(e) =>
                setProjectForm({ ...projectForm, internId: e.target.value })
              }
              required
            >
              <option value="">Select intern…</option>
              {interns.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input
              type="date"
              value={projectForm.deadline}
              onChange={(e) =>
                setProjectForm({ ...projectForm, deadline: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Progress %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={projectForm.progressPercent}
              onChange={(e) =>
                setProjectForm({ ...projectForm, progressPercent: e.target.value })
              }
            />
          </div>
          <div className="flex items-end md:col-span-2 xl:col-span-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create project"}
            </Button>
          </div>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((p) => (
          <div key={p.id} className="glass-card p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{p.title}</h3>
              <Badge variant="secondary">{p.status}</Badge>
            </div>
            {p.description ? (
              <p className="mt-1 text-sm text-slate-600">{p.description}</p>
            ) : null}
            <p className="mt-1 text-sm text-slate-500">
              <Link href={`/users/${p.internId}`} className="hover:text-blue-700">
                {p.internName}
              </Link>
              {p.techStack ? `, ${p.techStack}` : ""}
            </p>
            <p className="mt-3 text-sm">
              {p.progressPercent}%, due {p.deadline || "-"}
            </p>
          </div>
        ))}
        {projects.length === 0 && !loading ? (
          <p className="text-sm text-slate-500 md:col-span-2">No projects yet</p>
        ) : null}
      </div>

      <div className="glass-card p-5">
        <h3 className="mb-3 font-semibold">Intern tasks</h3>
        <ul className="space-y-2 text-sm">
          {internTasks.map((t) => (
            <li
              key={t.id}
              className="flex justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0"
            >
              <span>
                <span className="font-medium text-slate-900">{t.title}</span>
                {taskDetailLine(t) ? (
                  <span className="text-slate-500"> {taskDetailLine(t)}</span>
                ) : null}
              </span>
              <Badge variant="secondary">{t.status}</Badge>
            </li>
          ))}
          {internTasks.length === 0 ? (
            <li className="text-slate-500">No intern tasks</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}