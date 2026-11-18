"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CourseDocCover } from "@/components/courses/course-doc-cover";

export type EditorTopic = {
  key: string;
  id?: string;
  title: string;
  minutes: number;
};

export type EditorSection = {
  key: string;
  id?: string;
  title: string;
  topics: EditorTopic[];
};

export type CourseEditorValue = {
  title: string;
  category: string;
  batchLabel: string;
  description: string;
  thumbnailUrl: string;
  durationMonths: number;
  monthlyFee: number;
  installmentFee: number;
  installmentCount: number;
  totalFee: number;
  published: boolean;
  allowEnrollmentRequests: boolean;
  instructorId: string;
  instructorExperience: string;
  instructorBio: string;
  outline: EditorSection[];
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyCourseValue(): CourseEditorValue {
  return {
    title: "",
    category: "Coding",
    batchLabel: "",
    description: "",
    thumbnailUrl: "",
    durationMonths: 3,
    monthlyFee: 0,
    installmentFee: 0,
    installmentCount: 2,
    totalFee: 0,
    published: true,
    allowEnrollmentRequests: false,
    instructorId: "",
    instructorExperience: "",
    instructorBio: "",
    outline: [
      {
        key: uid("sec"),
        title: "Month 1: Foundations",
        topics: [
          { key: uid("lec"), title: "Orientation", minutes: 45 },
          { key: uid("lec"), title: "Environment setup", minutes: 60 },
        ],
      },
    ],
  };
}

export function courseToEditorValue(course: {
  title: string;
  category: string;
  batch?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  durationMonths: number;
  monthlyFee: number;
  installmentFee: number;
  installmentCount?: number;
  totalFee: number;
  published: boolean;
  allowEnrollmentRequests?: boolean;
  instructorId?: string | null;
  instructorExperience?: string | null;
  instructorBio?: string | null;
  outline?: {
    id: string;
    title: string;
    topics: { id: string; title: string; minutes?: number }[];
  }[];
}): CourseEditorValue {
  return {
    title: course.title,
    category: course.category,
    batchLabel: course.batch ?? "",
    description: course.description ?? "",
    thumbnailUrl: course.thumbnailUrl ?? "",
    durationMonths: course.durationMonths,
    monthlyFee: course.monthlyFee,
    installmentFee: course.installmentFee,
    installmentCount: course.installmentCount ?? 2,
    totalFee: course.totalFee,
    published: course.published,
    allowEnrollmentRequests: course.allowEnrollmentRequests ?? false,
    instructorId: course.instructorId ?? "",
    instructorExperience: course.instructorExperience ?? "",
    instructorBio: course.instructorBio ?? "",
    outline:
      course.outline?.map((s) => ({
        key: s.id,
        id: s.id,
        title: s.title,
        topics: s.topics.map((t) => ({
          key: t.id,
          id: t.id,
          title: t.title,
          minutes: t.minutes ?? 45,
        })),
      })) ?? emptyCourseValue().outline,
  };
}

export function editorValueToPayload(value: CourseEditorValue) {
  return {
    title: value.title.trim(),
    category: value.category.trim() || "General",
    batchLabel: value.batchLabel.trim() || null,
    description: value.description.trim() || null,
    thumbnailUrl: value.thumbnailUrl.trim() || null,
    durationMonths: Number(value.durationMonths) || 1,
    monthlyFee: Number(value.monthlyFee) || 0,
    installmentFee: Number(value.installmentFee) || 0,
    installmentCount: Math.max(1, Number(value.installmentCount) || 2),
    totalFee: Number(value.totalFee) || 0,
    published: value.published,
    allowEnrollmentRequests: value.allowEnrollmentRequests,
    instructorId: value.instructorId.trim() || null,
    outline: value.outline.map((s, si) => ({
      id: s.id,
      title: s.title.trim(),
      order: si,
      topics: s.topics.map((t, ti) => ({
        id: t.id,
        title: t.title.trim(),
        minutes: Number(t.minutes) || 45,
        order: ti,
      })),
    })),
  };
}

/** Persist instructor experience/bio on the assigned staff user. */
export async function syncInstructorProfile(value: CourseEditorValue) {
  const instructorId = value.instructorId.trim();
  if (!instructorId) return;
  await api(`/users/${instructorId}`, {
    method: "PATCH",
    body: JSON.stringify({
      experience: value.instructorExperience.trim() || null,
      bio: value.instructorBio.trim() || null,
    }),
  });
}

async function fileToCoverDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxW = 960;
  const scale = Math.min(1, maxW / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}

type Props = {
  value: CourseEditorValue;
  onChange: (next: CourseEditorValue) => void;
  saving?: boolean;
  onSave: () => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function CourseEditor({
  value,
  onChange,
  saving,
  onSave,
  onCancel,
  submitLabel = "Save course",
}: Props) {
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [instructors, setInstructors] = useState<
    {
      id: string;
      fullName?: string;
      name?: string;
      email: string;
      experience?: string | null;
      bio?: string | null;
    }[]
  >([]);

  useEffect(() => {
    api<{
      items: {
        id: string;
        fullName?: string;
        name?: string;
        email: string;
        experience?: string | null;
        bio?: string | null;
      }[];
    }>("/users?accountType=STAFF&pageSize=100")
      .then((r) => setInstructors(r.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api<Array<{ name: string }>>("/system/categories")
      .then((rows) => setCategories(rows.map((r) => r.name).filter(Boolean)))
      .catch(() =>
        api<Array<{ name: string }>>("/courses/categories")
          .then((rows) =>
            setCategories(rows.map((r) => r.name).filter(Boolean))
          )
          .catch(() => {})
      );
  }, []);

  const suggestedTotal = useMemo(
    () => value.monthlyFee * Math.max(1, value.durationMonths),
    [value.monthlyFee, value.durationMonths]
  );
  const suggestedInstallment = useMemo(() => {
    const count = Math.max(1, value.installmentCount || 2);
    return Math.round((value.monthlyFee || 0) / count);
  }, [value.monthlyFee, value.installmentCount]);

  const categoryOptions = useMemo(() => {
    const names = new Set(categories);
    if (value.category.trim()) names.add(value.category.trim());
    return Array.from(names);
  }, [categories, value.category]);

  const set = <K extends keyof CourseEditorValue>(
    key: K,
    next: CourseEditorValue[K]
  ) => onChange({ ...value, [key]: next });

  useEffect(() => {
    if (!value.instructorId) return;
    const match = instructors.find((u) => u.id === value.instructorId);
    if (!match) return;
    const patch: Partial<CourseEditorValue> = {};
    if (!value.instructorExperience && match.experience) {
      patch.instructorExperience = match.experience;
    }
    if (!value.instructorBio && match.bio) {
      patch.instructorBio = match.bio;
    }
    if (Object.keys(patch).length) onChange({ ...value, ...patch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructors, value.instructorId]);

  const updateSection = (key: string, patch: Partial<EditorSection>) => {
    set(
      "outline",
      value.outline.map((s) => (s.key === key ? { ...s, ...patch } : s))
    );
  };

  const updateTopic = (
    sectionKey: string,
    topicKey: string,
    patch: Partial<EditorTopic>
  ) => {
    set(
      "outline",
      value.outline.map((s) =>
        s.key !== sectionKey
          ? s
          : {
              ...s,
              topics: s.topics.map((t) =>
                t.key === topicKey ? { ...t, ...patch } : t
              ),
            }
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="glass-card grid gap-4 p-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Course title</Label>
          <Input
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Flutter Development"
          />
        </div>
        <div className="space-y-2">
          <Label>Category (student app tabs)</Label>
          {categoryOptions.length > 0 ? (
            <select
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={value.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {categoryOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={value.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="Flutter / Frontend / Dot Net"
            />
          )}
          <p className="text-[11px] text-slate-400">
            Manage tab names in System → Course categories
          </p>
        </div>
        <div className="space-y-2">
          <Label>Batch code</Label>
          <Input
            value={value.batchLabel}
            onChange={(e) => set("batchLabel", e.target.value)}
            placeholder="CT-FLUTTER-NOV-26"
          />
        </div>
        <div className="space-y-2">
          <Label>Duration (months)</Label>
          <Input
            type="number"
            min={1}
            value={value.durationMonths}
            onChange={(e) => set("durationMonths", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Monthly fee (Rs)</Label>
          <Input
            type="number"
            min={0}
            value={value.monthlyFee}
            onChange={(e) => set("monthlyFee", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Installment count</Label>
          <Input
            type="number"
            min={1}
            value={value.installmentCount}
            onChange={(e) => set("installmentCount", Number(e.target.value))}
          />
          <p className="text-xs text-slate-500">
            Suggested per installment ~ Rs {suggestedInstallment.toLocaleString()}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Per installment (Rs)</Label>
          <Input
            type="number"
            min={0}
            value={value.installmentFee}
            onChange={(e) => set("installmentFee", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Complete / total fee (Rs)</Label>
          <Input
            type="number"
            min={0}
            value={value.totalFee}
            onChange={(e) => set("totalFee", Number(e.target.value))}
          />
          <button
            type="button"
            className="text-xs font-medium text-blue-600 hover:underline"
            onClick={() => set("totalFee", suggestedTotal)}
          >
            Use monthly × months = Rs {suggestedTotal.toLocaleString()}
          </button>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 md:col-span-2">
          <div>
            <p className="text-sm font-medium">Published to student app</p>
            <p className="text-xs text-slate-500">
              Students see this course live after save
            </p>
          </div>
          <Switch
            checked={value.published}
            onCheckedChange={(checked) => set("published", checked)}
          />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 md:col-span-2">
          <div>
            <p className="text-sm font-medium">Allow enrollment requests</p>
            <p className="text-xs text-slate-500">
              Students submit a request; admin approves before access
            </p>
          </div>
          <Switch
            checked={value.allowEnrollmentRequests}
            onCheckedChange={(checked) =>
              set("allowEnrollmentRequests", checked)
            }
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Course instructor</Label>
          <select
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={value.instructorId}
            onChange={(e) => {
              const id = e.target.value;
              const match = instructors.find((u) => u.id === id);
              onChange({
                ...value,
                instructorId: id,
                instructorExperience: match?.experience ?? "",
                instructorBio: match?.bio ?? "",
              });
            }}
          >
            <option value="">No instructor assigned</option>
            {instructors.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName || u.name || u.email}
              </option>
            ))}
          </select>
        </div>
        {value.instructorId ? (
          <>
            <div className="space-y-2">
              <Label>Instructor experience</Label>
              <Input
                value={value.instructorExperience}
                onChange={(e) => set("instructorExperience", e.target.value)}
                placeholder="e.g. 5 years industry experience"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Instructor profile / description</Label>
              <Textarea
                value={value.instructorBio}
                onChange={(e) => set("instructorBio", e.target.value)}
                placeholder="Short bio shown on student course details"
                rows={3}
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="glass-card space-y-4 p-5">
        <div>
          <h3 className="font-semibold">Cover image</h3>
          <p className="text-sm text-slate-500">
            Upload a photo or paste an image URL. Shown on admin tiles and in the
            student app.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="h-36 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {value.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value.thumbnailUrl}
                alt="Course cover"
                className="h-36 w-full object-cover"
              />
            ) : (
              <CourseDocCover title={value.title || "Course"} />
            )}
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={
                  value.thumbnailUrl.startsWith("data:")
                    ? ""
                    : value.thumbnailUrl
                }
                onChange={(e) => set("thumbnailUrl", e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label>Or upload from device</Label>
              <Input
                type="file"
                accept="image/*"
                disabled={coverBusy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setCoverBusy(true);
                  setCoverError(null);
                  try {
                    const dataUrl = await fileToCoverDataUrl(file);
                    set("thumbnailUrl", dataUrl);
                  } catch {
                    setCoverError("Could not process that image");
                  } finally {
                    setCoverBusy(false);
                    e.target.value = "";
                  }
                }}
              />
              {coverBusy ? (
                <p className="text-xs text-slate-500">Compressing cover…</p>
              ) : null}
              {coverError ? (
                <p className="text-xs text-red-600">{coverError}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card space-y-4 p-5">
        <div>
          <h3 className="font-semibold">Details & roadmap</h3>
          <p className="text-sm text-slate-500">
            Course summary plus modules and lectures. Edit freely anytime.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Course details</Label>
          <Textarea
            rows={4}
            value={value.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What students will learn, who it is for, outcomes…"
            className="rounded-xl border-slate-200 focus-visible:ring-blue-500"
          />
        </div>

        <div className="space-y-4">
          {value.outline.map((section, si) => (
            <div
              key={section.key}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <div className="mb-3 flex items-start gap-2">
                <GripVertical className="mt-2.5 h-4 w-4 text-slate-300" />
                <div className="flex-1 space-y-2">
                  <Label>Module {si + 1}</Label>
                  <Input
                    value={section.title}
                    onChange={(e) =>
                      updateSection(section.key, { title: e.target.value })
                    }
                    placeholder="e.g. Month 2: Widgets and state"
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    set(
                      "outline",
                      value.outline.filter((s) => s.key !== section.key)
                    )
                  }
                  aria-label="Remove module"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>

              <div className="space-y-2 pl-6">
                {section.topics.map((topic, ti) => (
                  <div
                    key={topic.key}
                    className="grid gap-2 rounded-xl border border-slate-200 bg-white p-2 md:grid-cols-[1fr_100px_auto]"
                  >
                    <Input
                      value={topic.title}
                      onChange={(e) =>
                        updateTopic(section.key, topic.key, {
                          title: e.target.value,
                        })
                      }
                      placeholder={`Lecture ${ti + 1} title`}
                    />
                    <Input
                      type="number"
                      min={5}
                      value={topic.minutes}
                      onChange={(e) =>
                        updateTopic(section.key, topic.key, {
                          minutes: Number(e.target.value),
                        })
                      }
                      title="Minutes"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        updateSection(section.key, {
                          topics: section.topics.filter(
                            (t) => t.key !== topic.key
                          ),
                        })
                      }
                      aria-label="Remove lecture"
                    >
                      <Trash2 className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    updateSection(section.key, {
                      topics: [
                        ...section.topics,
                        {
                          key: uid("lec"),
                          title: "",
                          minutes: 45,
                        },
                      ],
                    })
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add lecture
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              set("outline", [
                ...value.outline,
                {
                  key: uid("sec"),
                  title: `Module ${value.outline.length + 1}`,
                  topics: [{ key: uid("lec"), title: "", minutes: 45 }],
                },
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Add roadmap module
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onSave} disabled={saving || !value.title.trim()}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
