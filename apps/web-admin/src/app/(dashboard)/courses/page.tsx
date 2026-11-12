"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

type Course = {
  id: string;
  title: string;
  category: string;
  batch?: string | null;
  published: boolean;
  enrolledCount?: number;
  monthlyFee: number;
  totalFee: number;
  durationMonths: number;
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Course[]>("/courses?all=1")
      .then(setCourses)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Courses</h2>
        <p className="text-sm text-slate-500">Published catalog synced to Android app</p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((c) => (
          <div key={c.id} className="glass-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="text-sm text-slate-500">
                  {c.category} · {c.batch || "—"} · {c.durationMonths} mo
                </p>
              </div>
              <Badge variant={c.published ? "success" : "secondary"}>
                {c.published ? "Published" : "Draft"}
              </Badge>
            </div>
            <p className="mt-3 text-sm">
              Fee Rs {c.monthlyFee.toLocaleString()}/mo · total Rs{" "}
              {c.totalFee.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">
              Enrolled {c.enrolledCount ?? 0}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
