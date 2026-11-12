"use client";

import { useState } from "react";
import { internProjects as initial, interns, adminUser } from "@/lib/mock-data";
import type { InternProject, ProjectStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSnackbar } from "@/components/ui/snackbar";
import { useNotifications } from "@/components/ui/notifications-provider";

function projectBadge(status: ProjectStatus) {
  if (status === "DONE") return <Badge variant="success">Done</Badge>;
  if (status === "REVIEW") return <Badge variant="warning">Review</Badge>;
  if (status === "IN_PROGRESS") return <Badge variant="default">In progress</Badge>;
  return <Badge variant="secondary">Assigned</Badge>;
}

export default function InternsPage() {
  const list = interns();
  const [projects, setProjects] = useState<InternProject[]>(initial);
  const { show } = useSnackbar();
  const { push } = useNotifications();
  const [form, setForm] = useState({
    title: "",
    description: "",
    internId: list[0]?.id ?? "",
    deadline: "2026-11-25",
    techStack: "Flutter + Provider",
  });

  function assignProject() {
    if (!form.title.trim() || !form.internId) return;
    const intern = list.find((i) => i.id === form.internId)!;
    const project: InternProject = {
      id: `proj-${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim() || "Complete assigned intern project.",
      internId: intern.id,
      internName: intern.name,
      assignedBy: adminUser.name,
      status: "ASSIGNED",
      deadline: form.deadline,
      techStack: form.techStack,
      progressPercent: 0,
      updatedAt: "Just now",
    };
    setProjects((prev) => [project, ...prev]);
    setForm({ ...form, title: "", description: "" });
    push({
      title: "Intern project assigned",
      body: `${project.title} → ${intern.name}`,
      type: "project",
    });
    show(`Project assigned to ${intern.name}`);
  }

  function setStatus(id: string, status: ProjectStatus) {
    const project = projects.find((p) => p.id === id);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status,
              progressPercent: status === "DONE" ? 100 : p.progressPercent,
              updatedAt: "Just now",
            }
          : p
      )
    );
    if (project) {
      push({
        title: "Project status updated",
        body: `${project.title} → ${status}`,
        type: "project",
      });
    }
    show(`Project status updated → ${status}`);
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Interns</h2>
        <p className="text-sm text-slate-500">
          Assign projects and track delivery · progress reflected from app
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="glass-card p-5 space-y-3">
          <h3 className="font-semibold">Assign project</h3>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Attendance realtime sync"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Intern</Label>
            <Select
              value={form.internId}
              onValueChange={(v) => setForm({ ...form, internId: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {list.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} · {i.track}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tech stack</Label>
            <Input
              value={form.techStack}
              onChange={(e) => setForm({ ...form, techStack: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <Button className="w-full" onClick={assignProject}>
            Assign project
          </Button>
        </div>

        <div className="space-y-4">
          <div className="glass-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold">Intern roster</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {list.map((i) => (
                <div key={i.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-semibold">{i.name}</p>
                    <p className="text-xs text-slate-500">
                      {i.track} · {i.batch} · Attend {i.attendancePercent}%
                    </p>
                  </div>
                  <Badge variant="default">INTERN</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold">Assigned projects</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {projects.map((p) => (
                <div key={p.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{p.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{p.description}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {p.internName} · {p.techStack} · due {p.deadline} · {p.progressPercent}%
                      </p>
                    </div>
                    {projectBadge(p.status)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setStatus(p.id, "IN_PROGRESS")}>
                      In progress
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setStatus(p.id, "REVIEW")}>
                      Review
                    </Button>
                    <Button size="sm" onClick={() => setStatus(p.id, "DONE")}>
                      Mark done
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
