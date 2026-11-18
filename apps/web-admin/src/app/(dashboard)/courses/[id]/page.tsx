"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSnackbar } from "@/components/ui/snackbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CourseEditor,
  courseToEditorValue,
  editorValueToPayload,
  emptyCourseValue,
  syncInstructorProfile,
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
  allowEnrollmentRequests?: boolean;
  instructorId?: string | null;
  instructorName?: string | null;
  instructorExperience?: string | null;
  instructorBio?: string | null;
  enrolledCount?: number;
  outline?: {
    id: string;
    title: string;
    topics: { id: string; title: string; minutes?: number }[];
  }[];
};

type EnrolledStudent = {
  id: string;
  name: string;
  email: string;
  batch?: string | null;
  enrolledAt: string;
  feeStatus?: string | null;
  attendancePercent: number;
  enrollmentStatus: string;
  accountStatus?: string;
};

type StudentsPayload = {
  pendingEnrollmentRequests: number;
  totalEnrolled: number;
  activeStudents: number;
  students: EnrolledStudent[];
};

export default function EditCoursePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useSnackbar();
  const [value, setValue] = useState<CourseEditorValue>(emptyCourseValue);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseMeta, setCourseMeta] = useState<CourseDto | null>(null);
  const [enrollment, setEnrollment] = useState<StudentsPayload | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    Promise.all([
      api<CourseDto>(`/courses/${params.id}`),
      api<StudentsPayload>(`/courses/${params.id}/students`).catch(() => null),
    ])
      .then(([c, students]) => {
        setCourseMeta(c);
        setValue(courseToEditorValue(c));
        if (students) setEnrollment(students);
      })
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
            Update fees, cover, modules or lectures. Student app picks this up on
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

      {courseMeta ? (
        <div className="glass-card space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {courseMeta.title}
              </h3>
              {courseMeta.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {courseMeta.description}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-400">No description</p>
              )}
            </div>
            <Badge variant={courseMeta.published ? "success" : "secondary"}>
              {courseMeta.published ? "Published" : "Draft"}
            </Badge>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">Duration</dt>
              <dd className="font-medium">{courseMeta.durationMonths} mo</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Fees</dt>
              <dd className="font-medium">
                Rs {courseMeta.monthlyFee.toLocaleString()}/mo, Rs{" "}
                {courseMeta.totalFee.toLocaleString()} total
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Instructor</dt>
              <dd className="font-medium">
                {courseMeta.instructorName || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Batch</dt>
              <dd className="font-medium">{courseMeta.batch || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Enrolled</dt>
              <dd className="font-medium">
                {enrollment?.totalEnrolled ??
                  courseMeta.enrolledCount ??
                  0}{" "}
                total
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Active students</dt>
              <dd className="font-medium">
                {enrollment?.activeStudents ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Pending requests</dt>
              <dd className="font-medium">
                {(enrollment?.pendingEnrollmentRequests ?? 0) > 0 ? (
                  <Link
                    href={`/courses/requests?courseId=${params.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {enrollment?.pendingEnrollmentRequests} pending →
                  </Link>
                ) : (
                  "0"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Category</dt>
              <dd className="font-medium">{courseMeta.category}</dd>
            </div>
          </dl>

          <div>
            <h4 className="mb-2 font-semibold">Enrolled students</h4>
            <div className="table-scroll overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Email</th>
                    <th className="px-4 py-2.5 font-medium">Batch</th>
                    <th className="px-4 py-2.5 font-medium">Enrolled</th>
                    <th className="px-4 py-2.5 font-medium">Fees</th>
                    <th className="px-4 py-2.5 font-medium">Attendance</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(enrollment?.students ?? []).map((s) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <Link
                          href={`/users/${s.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-700"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {s.email}
                      </td>
                      <td className="px-4 py-3">{s.batch || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {s.enrolledAt}
                      </td>
                      <td className="px-4 py-3">
                        {s.feeStatus ? (
                          <Badge variant="outline">{s.feeStatus}</Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {s.attendancePercent}%
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {s.enrollmentStatus}
                        {s.accountStatus ? `, ${s.accountStatus}` : ""}
                      </td>
                    </tr>
                  ))}
                  {(enrollment?.students ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No enrolled students yet
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

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
            await syncInstructorProfile(value);
            show("Course updated and synced for students");
            const [fresh, students] = await Promise.all([
              api<CourseDto>(`/courses/${params.id}`),
              api<StudentsPayload>(`/courses/${params.id}/students`).catch(
                () => null
              ),
            ]);
            setCourseMeta(fresh);
            setValue(courseToEditorValue(fresh));
            if (students) setEnrollment(students);
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
