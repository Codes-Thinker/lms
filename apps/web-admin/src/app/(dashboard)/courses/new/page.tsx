"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSnackbar } from "@/components/ui/snackbar";
import {
  CourseEditor,
  emptyCourseValue,
  editorValueToPayload,
  syncInstructorProfile,
  type CourseEditorValue,
} from "@/components/courses/course-editor";

export default function NewCoursePage() {
  const router = useRouter();
  const { show } = useSnackbar();
  const [value, setValue] = useState<CourseEditorValue>(emptyCourseValue);
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <p className="text-xs font-medium text-blue-600">
          <Link href="/courses">← Courses</Link>
        </p>
        <h2 className="mt-1 text-lg font-semibold">Add course tile</h2>
        <p className="text-sm text-slate-500">
          Set fees, cover, details and roadmap. Publish to show on the student
          app immediately.
        </p>
      </div>

      <CourseEditor
        value={value}
        onChange={setValue}
        saving={saving}
        submitLabel="Create & publish"
        onCancel={() => router.push("/courses")}
        onSave={async () => {
          setSaving(true);
          try {
            const created = await api<{ id: string }>("/courses", {
              method: "POST",
              body: JSON.stringify(editorValueToPayload(value)),
            });
            await syncInstructorProfile(value);
            show("Course created. Live for students if published.");
            router.push(`/courses/${created.id}`);
          } catch (e) {
            show(e instanceof Error ? e.message : "Could not create course", "error");
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
