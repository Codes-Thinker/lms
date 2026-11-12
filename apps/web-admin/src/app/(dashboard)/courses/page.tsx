"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseDocCover } from "@/components/courses/course-doc-cover";

type Course = {
  id: string;
  title: string;
  category: string;
  batch?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  published: boolean;
  enrolledCount?: number;
  monthlyFee: number;
  totalFee: number;
  installmentFee: number;
  installmentCount?: number;
  durationMonths: number;
  outline?: { id: string; topics: unknown[] }[];
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api<Course[]>("/courses?all=1")
      .then(setCourses)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-semibold">Courses</h2>
          <p className="text-sm text-slate-500">
            Tiles sync live to the student app when published — fees, cover,
            roadmap, lectures.
          </p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
        <Button asChild>
          <Link href="/courses/new">
            <Plus className="mr-1 h-4 w-4" />
            Add course
          </Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading courses…</p>
      ) : courses.length === 0 ? (
        <div className="glass-card p-8 text-center text-sm text-slate-500">
          No courses yet. Add your first tile to publish to students.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => {
            const lectures =
              c.outline?.reduce((n, s) => n + (s.topics?.length ?? 0), 0) ?? 0;
            const installments = c.installmentCount ?? 2;
            return (
              <Link
                key={c.id}
                href={`/courses/${c.id}`}
                className="glass-card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-40 bg-slate-100">
                  {c.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <CourseDocCover title={c.title} />
                  )}
                  <div className="absolute right-3 top-3">
                    <Badge variant={c.published ? "success" : "secondary"}>
                      {c.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <div>
                    <h3 className="font-semibold group-hover:text-blue-700">
                      {c.title}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {c.category} · {c.batch || "—"} · {c.durationMonths} mo
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-slate-50 px-2 py-2">
                      <p className="text-slate-500">Monthly</p>
                      <p className="font-semibold">
                        Rs {c.monthlyFee.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-2 py-2">
                      <p className="text-slate-500">{installments}× inst.</p>
                      <p className="font-semibold">
                        Rs {c.installmentFee.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-2 py-2">
                      <p className="text-slate-500">Complete</p>
                      <p className="font-semibold">
                        Rs {c.totalFee.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    {c.outline?.length ?? 0} modules · {lectures} lectures ·{" "}
                    {c.enrolledCount ?? 0} enrolled
                  </p>
                  {c.description ? (
                    <p className="line-clamp-2 text-xs text-slate-600">
                      {c.description}
                    </p>
                  ) : null}
                  <p className="text-xs font-medium text-blue-600">
                    Edit course →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
