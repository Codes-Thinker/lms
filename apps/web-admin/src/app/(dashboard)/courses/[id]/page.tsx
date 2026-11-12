"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSnackbar } from "@/components/ui/snackbar";
import { Button } from "@/components/ui/button";
import {
  CourseEditor,
  courseToEditorValue,
  editorValueToPayload,
  emptyCourseValue,
  type CourseEditorValue,
} from "@/components/courses/course-editor";

type CourseDto = {
  id: string;
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
  outline?: {
    id: string;
    title: string;
    topics: { id: string; title: string; minutes?: number }[];
  }[];
};

export default function EditCoursePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useSnackbar();
  const [value, setValue] = useState<CourseEditorValue>(emptyCourseValue);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    api<CourseDto>(`/courses/${params.id}`)
      .then((c) => setValue(courseToEditorValue(c)))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) {
    return <div className="p-5 text-sm text-slate-500">Loading course…</div>;
  }

  if (error) {
    return (
      <div className="glass-card space-y-3 p-5">
        <p className="text-sm text-red-600">{error}</p>
        <Button asChild variant="secondary">
          <Link href="/courses">Back to courses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <p className="text-xs font-medium text-blue-600">
            <Link href="/courses">← Courses</Link>
          </p>
          <h2 className="mt-1 text-lg font-semibold">Edit course</h2>
          <p className="text-sm text-slate-500">
            Update fees, cover, modules or lectures — student app picks this up on
            next refresh.
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={async () => {
            if (!params?.id) return;
            if (!confirm("Delete this course permanently?")) return;
            try {
              await api(`/courses/${params.id}`, { method: "DELETE" });
              show("Course deleted");
              router.push("/courses");
            } catch (e) {
              show(e instanceof Error ? e.message : "Delete failed", "error");
            }
          }}
        >
          Delete
        </Button>
      </div>

      <CourseEditor
        value={value}
        onChange={setValue}
        saving={saving}
        submitLabel="Save changes"
        onCancel={() => router.push("/courses")}
        onSave={async () => {
          if (!params?.id) return;
          setSaving(true);
          try {
            await api(`/courses/${params.id}`, {
              method: "PATCH",
              body: JSON.stringify(editorValueToPayload(value)),
            });
            show("Course updated — synced for students");
            const fresh = await api<CourseDto>(`/courses/${params.id}`);
            setValue(courseToEditorValue(fresh));
          } catch (e) {
            show(e instanceof Error ? e.message : "Could not save", "error");
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
