"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

type Task = {
  id: string;
  title: string;
  assignedToName?: string | null;
  status: string;
  dueAt?: string | null;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Array<{ id: string; name: string; email: string; track?: string | null }>>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    Promise.all([
      api<{ items: Array<Record<string, unknown>> }>("/users?accountType=STAFF&pageSize=100"),
      api<Task[]>("/tasks"),
    ]).then(([u, t]) => {
      setStaff(
        u.items.map((i) => ({
          id: String(i.id),
          name: String(i.name || i.fullName || ""),
          email: String(i.email || ""),
          track: (i.track as string) || null,
        }))
      );
      setTasks(t);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Staff</h2>
        <p className="text-sm text-slate-500">Teachers / staff + assigned tasks</p>
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Track</th>
              <th className="px-5 py-3 font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-5 py-3.5 font-semibold">{s.name}</td>
                <td className="px-5 py-3.5">{s.track || "—"}</td>
                <td className="px-5 py-3.5">{s.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3">
        {tasks.map((t) => (
          <div key={t.id} className="glass-card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{t.title}</p>
              <p className="text-sm text-slate-500">
                {t.assignedToName || "Unassigned"} · due{" "}
                {t.dueAt ? new Date(t.dueAt).toLocaleString() : "—"}
              </p>
            </div>
            <Badge variant="secondary">{t.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
