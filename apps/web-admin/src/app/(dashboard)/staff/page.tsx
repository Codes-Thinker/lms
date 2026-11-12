"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";

type Task = {
  id: string;
  title: string;
  assignedToName?: string | null;
  status: string;
  dueAt?: string | null;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<
    Array<{ id: string; name: string; email: string; track?: string | null }>
  >([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    Promise.all([
      api<{ items: Array<Record<string, unknown>> }>(
        "/users?accountType=STAFF&pageSize=100"
      ),
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
        <h2 className="text-lg font-semibold">Teachers</h2>
        <p className="text-sm text-slate-500">
          Teaching staff (account type Staff) — open profile for full details
        </p>
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Teacher</th>
              <th className="px-5 py-3 font-medium">Track</th>
              <th className="px-5 py-3 font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
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
                <td className="px-5 py-3.5">{s.track || "—"}</td>
                <td className="px-5 py-3.5">{s.email}</td>
              </tr>
            ))}
            {staff.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-slate-500">
                  No teachers yet — add from Users as Teacher
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="glass-card p-5">
        <h3 className="mb-3 font-semibold">Staff tasks</h3>
        <ul className="space-y-2 text-sm">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex justify-between border-t border-slate-100 pt-2 first:border-0 first:pt-0"
            >
              <span>
                {t.title}
                {t.assignedToName ? ` · ${t.assignedToName}` : ""}
              </span>
              <Badge variant="secondary">{t.status}</Badge>
            </li>
          ))}
          {tasks.length === 0 ? (
            <li className="text-slate-500">No tasks</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
