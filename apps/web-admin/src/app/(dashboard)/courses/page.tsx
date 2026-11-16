"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseDocCover } from "@/components/courses/course-doc-cover";
import { useSnackbar } from "@/components/ui/snackbar";
import { cn } from "@/lib/utils";

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
  const { show } = useSnackbar();
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryTab, setCategoryTab] = useState("All");

  const categories = useMemo(() => {
    const set = new Set(
      courses.map((c) => c.category?.trim()).filter((x): x is string => Boolean(x))
    );
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [courses]);

  const visibleCourses = useMemo(() => {
    if (categoryTab === "All") return courses;
    return courses.filter((c) => c.category === categoryTab);
  }, [courses, categoryTab]);

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

  async function deleteCourse(c: Course) {
    if (
      !confirm(
        `Delete “${c.title}” permanently? Students will lose this course tile.`
      )
    ) {
      return;
    }
    setDeletingId(c.id);
    try {
      await api(`/courses/${c.id}`, { method: "DELETE" });
      setCourses((prev) => prev.filter((x) => x.id !== c.id));
      show("Course deleted");
    } catch (e) {
      show(e instanceof Error ? e.message : "Delete failed", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-semibold">Courses</h2>
          <p className="text-sm text-slate-500">
            Edit, publish, or delete tiles — student app syncs when published
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
        <>
          {categories.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = categoryTab === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryTab(cat)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                      active
                        ? "bg-[#2563EB] text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {cat}
                    {cat !== "All" ? (
                      <span
                        className={cn(
                          "ml-1.5 text-xs",
                          active ? "text-blue-100" : "text-slate-400"
                        )}
                      >
                        {courses.filter((c) => c.category === cat).length}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {visibleCourses.length === 0 ? (
            <div className="glass-card p-8 text-center text-sm text-slate-500">
              No courses in this category.
            </div>
          ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleCourses.map((c) => {
            const lectures =
              c.outline?.reduce((n, s) => n + (s.topics?.length ?? 0), 0) ?? 0;
            const installments = c.installmentCount ?? 2;
            return (
              <div
                key={c.id}
                className="glass-card group overflow-hidden transition hover:-translate-y-0.5"
              >
                <Link href={`/courses/${c.id}`} className="block">
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
                </Link>
                <div className="space-y-2 p-4">
                  <Link href={`/courses/${c.id}`} className="block">
                    <h3 className="font-semibold group-hover:text-blue-700">
                      {c.title}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {c.category} · {c.batch || "—"} · {c.durationMonths} mo
                    </p>
                  </Link>
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
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Link
                      href={`/courses/${c.id}`}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Edit course →
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={deletingId === c.id}
                      onClick={() => void deleteCourse(c)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      {deletingId === c.id ? "Deleting…" : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
          )}
        </>
      )}
    </div>
  );
}
