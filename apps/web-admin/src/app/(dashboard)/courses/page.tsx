"use client";

import { useMemo, useState } from "react";
import { courses as initialCourses, courseProgress } from "@/lib/mock-data";
import type { Course } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useSnackbar } from "@/components/ui/snackbar";
import { useNotifications } from "@/components/ui/notifications-provider";

type CourseForm = {
  title: string;
  category: string;
  batch: string;
  durationMonths: number;
  totalFee: number;
  monthlyFee: number;
  installmentFee: number;
  description: string;
  published: boolean;
};

const emptyForm: CourseForm = {
  title: "",
  category: "Flutter",
  batch: "",
  durationMonths: 4,
  totalFee: 48000,
  monthlyFee: 12000,
  installmentFee: 6000,
  description: "",
  published: true,
};

export default function CoursesPage() {
  const [courseList, setCourseList] = useState<Course[]>(initialCourses);
  const [selectedId, setSelectedId] = useState(initialCourses[0]?.id ?? "");
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const selected = courseList.find((c) => c.id === selectedId) ?? courseList[0];
  const progress = selected ? courseProgress(selected) : null;
  const { show } = useSnackbar();
  const { push } = useNotifications();

  const liveCount = useMemo(
    () => courseList.filter((c) => c.published).length,
    [courseList]
  );

  function syncFees(next: Partial<CourseForm>, base: CourseForm = form) {
    const durationMonths = next.durationMonths ?? base.durationMonths;
    let totalFee = next.totalFee ?? base.totalFee;
    let monthlyFee = next.monthlyFee ?? base.monthlyFee;
    let installmentFee = next.installmentFee ?? base.installmentFee;

    if (next.totalFee != null && next.monthlyFee == null) {
      monthlyFee = durationMonths > 0 ? Math.round(totalFee / durationMonths) : totalFee;
    }
    if (next.monthlyFee != null && next.totalFee == null) {
      totalFee = monthlyFee * durationMonths;
    }
    if (next.durationMonths != null && next.totalFee == null && next.monthlyFee == null) {
      totalFee = monthlyFee * durationMonths;
    }
    if (
      next.totalFee != null ||
      next.monthlyFee != null ||
      next.durationMonths != null
    ) {
      if (next.installmentFee == null) {
        installmentFee = Math.round(monthlyFee / 2);
      }
    }

    return { ...base, ...next, durationMonths, totalFee, monthlyFee, installmentFee };
  }

  function addCourse() {
    if (!form.title.trim()) {
      show("Course title required");
      return;
    }
    const id = `c-${Date.now()}`;
    const course: Course = {
      id,
      title: form.title.trim(),
      category: form.category.trim() || "General",
      batch: form.batch.trim() || `CT-${form.category.slice(0, 4).toUpperCase()}-NEW`,
      durationMonths: Number(form.durationMonths) || 1,
      monthlyFee: Number(form.monthlyFee) || 0,
      totalFee: Number(form.totalFee) || 0,
      installmentFee: Number(form.installmentFee) || 0,
      published: form.published,
      startMonth: new Date().toISOString().slice(0, 7),
      enrolledCount: 0,
      description: form.description.trim(),
      outline: [
        {
          id: `${id}-s1`,
          title: "Month 1 — Getting started",
          order: 1,
          topics: [
            { id: `${id}-t1`, title: "Orientation", completed: false, order: 1 },
            { id: `${id}-t2`, title: "Setup & basics", completed: false, order: 2 },
          ],
        },
      ],
    };
    setCourseList((prev) => [course, ...prev]);
    setSelectedId(id);
    setForm(emptyForm);
    push({
      title: "Course published to app",
      body: `${course.title} · ${course.durationMonths} mo · Rs ${course.monthlyFee}/mo`,
      type: "system",
    });
    show(`Course added · live in student app${course.published ? "" : " (draft)"}`);
  }

  function togglePublished(id: string) {
    setCourseList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, published: !c.published } : c))
    );
    show("Publish status updated · app catalog refreshed");
  }

  function toggleTopic(sectionId: string, topicId: string) {
    if (!selected) return;
    setCourseList((prev) =>
      prev.map((course) => {
        if (course.id !== selected.id) return course;
        return {
          ...course,
          outline: course.outline.map((section) => {
            if (section.id !== sectionId) return section;
            return {
              ...section,
              topics: section.topics.map((topic) =>
                topic.id === topicId ? { ...topic, completed: !topic.completed } : topic
              ),
            };
          }),
        };
      })
    );
    show("Topic progress updated");
  }

  if (!selected) {
    return <div className="glass-card p-6 text-sm text-slate-500">No courses yet — add one below.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Courses</h2>
        <p className="text-sm text-slate-500">
          Add course with months, total fee, monthly & installment · published courses show in the app
        </p>
        <p className="mt-1 text-xs font-medium text-blue-600">{liveCount} live in app catalog</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <div className="glass-card space-y-3 p-5">
            <h3 className="font-semibold">Add new course</h3>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Flutter Development"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Batch code</Label>
                <Input
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                  placeholder="CT-FLUTTER-DEC"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Duration (months)</Label>
              <Input
                type="number"
                value={form.durationMonths}
                onChange={(e) =>
                  setForm(syncFees({ durationMonths: Number(e.target.value) || 1 }))
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label>Total fee (Rs)</Label>
                <Input
                  type="number"
                  value={form.totalFee}
                  onChange={(e) =>
                    setForm(syncFees({ totalFee: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly fee (Rs)</Label>
                <Input
                  type="number"
                  value={form.monthlyFee}
                  onChange={(e) =>
                    setForm(syncFees({ monthlyFee: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Installment (Rs)</Label>
                <Input
                  type="number"
                  value={form.installmentFee}
                  onChange={(e) =>
                    setForm({ ...form, installmentFee: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Short description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <Label htmlFor="pub-new">Publish to app now</Label>
              <Switch
                id="pub-new"
                checked={form.published}
                onCheckedChange={(v) => setForm({ ...form, published: v })}
              />
            </div>
            <Button className="w-full" onClick={addCourse}>
              Add course
            </Button>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold">All courses</h3>
            </div>
            <div className="max-h-[420px] space-y-1 overflow-y-auto p-2">
              {courseList.map((course) => {
                const p = courseProgress(course);
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => setSelectedId(course.id)}
                    className={`w-full rounded-xl px-3 py-3 text-left transition ${
                      selected.id === course.id
                        ? "bg-blue-50 ring-1 ring-blue-200"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug">{course.title}</p>
                      <Badge variant={course.published ? "success" : "secondary"}>
                        {course.published ? "In app" : "Draft"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {course.durationMonths} mo · Total Rs {course.totalFee.toLocaleString()} ·
                      Monthly Rs {course.monthlyFee.toLocaleString()} · Inst Rs{" "}
                      {course.installmentFee.toLocaleString()} · {p.percent}%
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{selected.title}</h3>
                <p className="text-sm text-slate-500">
                  {selected.batch} · {selected.category} · {selected.enrolledCount} enrolled
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="published">In app</Label>
                <Switch
                  id="published"
                  checked={selected.published}
                  onCheckedChange={() => togglePublished(selected.id)}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Duration</p>
                <p className="mt-1 font-semibold">{selected.durationMonths} months</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Total fee</p>
                <p className="mt-1 font-semibold">Rs {selected.totalFee.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Monthly</p>
                <p className="mt-1 font-semibold">Rs {selected.monthlyFee.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Installment</p>
                <p className="mt-1 font-semibold">Rs {selected.installmentFee.toLocaleString()}</p>
              </div>
            </div>
            {selected.description ? (
              <p className="mt-3 text-sm text-slate-600">{selected.description}</p>
            ) : null}
          </div>

          <div className="glass-card p-5">
            <h3 className="font-semibold">Course outline</h3>
            <p className="text-sm text-slate-500">Mark topics done as batch progresses</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${progress?.percent ?? 0}%` }}
              />
            </div>
            <div className="mt-4 space-y-4">
              {selected.outline.map((section) => (
                <div key={section.id} className="space-y-2">
                  <p className="text-sm font-semibold">{section.title}</p>
                  {section.topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <span
                        className={`text-sm ${topic.completed ? "text-slate-400 line-through" : ""}`}
                      >
                        {topic.title}
                      </span>
                      <Button
                        size="sm"
                        variant={topic.completed ? "secondary" : "default"}
                        onClick={() => toggleTopic(section.id, topic.id)}
                      >
                        {topic.completed ? "Done" : "Mark done"}
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
