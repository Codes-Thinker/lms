"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

type Project = {
  id: string;
  title: string;
  internName: string;
  status: string;
  progressPercent: number;
  deadline?: string | null;
  techStack?: string | null;
};

export default function InternsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [interns, setInterns] = useState<Array<{ id: string; name: string; email: string }>>([]);

  useEffect(() => {
    Promise.all([
      api<Project[]>("/projects"),
      api<{ items: Array<Record<string, unknown>> }>("/users?accountType=INTERN&pageSize=100"),
    ]).then(([p, u]) => {
      setProjects(p);
      setInterns(
        u.items.map((i) => ({
          id: String(i.id),
          name: String(i.name || i.fullName || ""),
          email: String(i.email || ""),
        }))
      );
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Interns</h2>
        <p className="text-sm text-slate-500">Roster + assigned projects</p>
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Intern</th>
              <th className="px-5 py-3 font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {interns.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="px-5 py-3.5 font-semibold">{i.name}</td>
                <td className="px-5 py-3.5">{i.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((p) => (
          <div key={p.id} className="glass-card p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{p.title}</h3>
              <Badge variant="secondary">{p.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {p.internName} · {p.techStack || "—"}
            </p>
            <p className="mt-3 text-sm">{p.progressPercent}% · due {p.deadline || "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
