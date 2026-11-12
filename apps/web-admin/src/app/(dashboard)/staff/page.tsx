"use client";

import { useState } from "react";
import { adminUser, staff, staffTasks as initial } from "@/lib/mock-data";
import type { AssignedTask } from "@/types";
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

export default function StaffPage() {
  const list = staff();
  const [tasks, setTasks] = useState<AssignedTask[]>(initial);
  const { show } = useSnackbar();
  const { push } = useNotifications();
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedToId: list[0]?.id ?? "",
    dueAt: "2026-11-12T18:00",
    timerMinutes: 30,
  });

  function assignTask() {
    if (!form.title.trim() || !form.assignedToId) return;
    const person = list.find((s) => s.id === form.assignedToId)!;
    const task: AssignedTask = {
      id: `task-${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim() || "Complete this staff task.",
      studyNotes: form.description.trim() || "Follow admin instructions.",
      assignedToId: person.id,
      assignedToName: person.name,
      assignedBy: adminUser.name,
      audience: "STAFF",
      status: "PENDING",
      dueAt: new Date(form.dueAt).toISOString(),
      timerMinutes: Number(form.timerMinutes) || 30,
      spentMinutes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: "Just now",
      chat: [],
    };
    setTasks((prev) => [task, ...prev]);
    setForm({ ...form, title: "", description: "" });
    push({
      title: "Staff task assigned",
      body: `${task.title} → ${person.name}`,
      type: "task",
    });
    show(`Task assigned to ${person.name}`);
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Staff</h2>
        <p className="text-sm text-slate-500">
          Assign operational tasks to staff · they complete from the app
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="glass-card space-y-3 p-5">
          <h3 className="font-semibold">Assign staff task</h3>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Verify late attendance"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Staff member</Label>
            <Select
              value={form.assignedToId}
              onValueChange={(v) => setForm({ ...form, assignedToId: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {list.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due</Label>
              <Input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Timer (min)</Label>
              <Input
                type="number"
                value={form.timerMinutes}
                onChange={(e) => setForm({ ...form, timerMinutes: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Instructions</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <Button className="w-full" onClick={assignTask}>
            Assign to staff
          </Button>
        </div>

        <div className="space-y-4">
          <div className="glass-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold">Staff roster</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {list.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-slate-500">
                      {s.department} · Attend {s.attendancePercent}%
                    </p>
                  </div>
                  <Badge variant="default">STAFF</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold">Staff tasks</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {tasks.map((t) => (
                <div key={t.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{t.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{t.description}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        To {t.assignedToName} · timer {t.timerMinutes}m · due{" "}
                        {new Date(t.dueAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        t.status === "DONE"
                          ? "success"
                          : t.status === "IN_PROGRESS"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {t.status}
                    </Badge>
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
