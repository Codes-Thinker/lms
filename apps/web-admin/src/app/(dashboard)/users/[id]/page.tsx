"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { roleLabel } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useSnackbar } from "@/components/ui/snackbar";

const ACCOUNT_TYPES = ["STUDENT", "INTERN", "STAFF"] as const;
const STATUSES = ["ACTIVE", "INVITED", "INACTIVE"] as const;

type Report = {
  user: {
    id: string;
    fullName: string;
    email: string;
    accountType: string;
    status?: string;
    track?: string | null;
    designation?: string | null;
    experience?: string | null;
    bio?: string | null;
    department?: string | null;
    batch?: string | null;
    batchId?: string | null;
    phone?: string | null;
    profileImage?: string | null;
    lastLoginAt?: string | null;
    createdAt?: string;
    internshipStart?: string | null;
    internshipEnd?: string | null;
    monthlyFee?: number | null;
    totalCourseFee?: number | null;
    paymentType?: string | null;
    installment1Amount?: number | null;
    installment2Amount?: number | null;
    courseDurationMonths?: number | null;
  };
  attendancePercent: number;
  feesPending: number;
  feesPaid: number;
  courses: Array<{
    id: string;
    title: string;
    batch?: string | null;
    progressPercent: number;
    feeStatus?: string | null;
    paidAmount: number;
    totalFee: number;
  }>;
  recentAttendance: Array<{
    date: string;
    status: string;
    courseTitle?: string | null;
  }>;
  fees: Array<{
    id: string;
    courseTitle: string;
    month: string;
    amount: number;
    status: string;
    dueDate: string;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    audience?: string;
    dueAt?: string | null;
    assignedBy?: string | null;
  }>;
  projects?: Array<{
    id: string;
    title: string;
    techStack?: string | null;
    status: string;
    progressPercent: number;
    deadline?: string | null;
  }>;
  taughtCourses?: Array<{
    id: string;
    title: string;
    batch?: string | null;
    enrolledCount: number;
  }>;
};

type RawUser = {
  id: string;
  fullName?: string;
  name?: string;
  email: string;
  accountType?: string;
  status?: string;
  track?: string | null;
  designation?: string | null;
  experience?: string | null;
  bio?: string | null;
  department?: { name?: string } | string | null;
  batch?: { code?: string } | string | null;
  batchId?: string | null;
  phone?: string | null;
  profileImage?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  monthlyFee?: number | null;
  totalCourseFee?: number | null;
  paymentType?: string | null;
  installment1Amount?: number | null;
  installment2Amount?: number | null;
  courseDurationMonths?: number | null;
};

type BatchOption = {
  id: string;
  code: string;
  name: string;
  departmentName?: string | null;
};

function emptyReportFromUser(u: RawUser): Report {
  const dept =
    typeof u.department === "string"
      ? u.department
      : u.department?.name ?? null;
  const batch =
    typeof u.batch === "string" ? u.batch : u.batch?.code ?? null;
  return {
    user: {
      id: u.id,
      fullName: u.fullName || u.name || u.email,
      email: u.email,
      accountType: u.accountType || "STUDENT",
      status: u.status,
      track: u.track,
      designation: u.designation,
      experience: u.experience,
      bio: u.bio,
      department: dept,
      batch,
      batchId: u.batchId ?? null,
      phone: u.phone,
      profileImage: u.profileImage,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      monthlyFee: u.monthlyFee,
      totalCourseFee: u.totalCourseFee,
      paymentType: u.paymentType,
      installment1Amount: u.installment1Amount,
      installment2Amount: u.installment2Amount,
      courseDurationMonths: u.courseDurationMonths,
    },
    attendancePercent: 0,
    feesPending: 0,
    feesPaid: 0,
    courses: [],
    recentAttendance: [],
    fees: [],
    tasks: [],
  };
}

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useSnackbar();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [shiftStart, setShiftStart] = useState("10:00");
  const [shiftEnd, setShiftEnd] = useState("18:00");
  const [shiftSaving, setShiftSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempBusy, setTempBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [hoursPeriod, setHoursPeriod] = useState<"today" | "week" | "month">(
    "today"
  );
  const [hoursSummary, setHoursSummary] = useState<{
    expectedHours: number;
    workedHours: number;
    missingHours: number;
    overtimeHours: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    lateArrivals: number;
    earlyDepartures: number;
    days: Array<{
      date: string;
      status: string;
      checkInAt: string | null;
      checkOutAt: string | null;
      workedHours: number;
      missingHours: number;
      expectedHours: number;
      note: string | null;
    }>;
  } | null>(null);
  const [catalog, setCatalog] = useState<Array<{ id: string; title: string }>>(
    []
  );
  const [batchOptions, setBatchOptions] = useState<BatchOption[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    accountType: "STUDENT",
    status: "ACTIVE",
    phone: "",
    track: "",
    designation: "",
    experience: "",
    bio: "",
    batchId: "",
    monthlyFee: "",
    totalCourseFee: "",
    paymentType: "MONTHLY",
    installment1Amount: "",
    installment2Amount: "",
    courseDurationMonths: "",
    password: "",
    courseIds: [] as string[],
  });

  function hydrateForm(r: Report) {
    setForm({
      fullName: r.user.fullName || "",
      email: r.user.email || "",
      accountType: r.user.accountType || "STUDENT",
      status: r.user.status || "ACTIVE",
      phone: r.user.phone || "",
      track: r.user.track || "",
      designation: r.user.designation || "",
      experience: r.user.experience || "",
      bio: r.user.bio || "",
      batchId: r.user.batchId || "",
      monthlyFee:
        r.user.monthlyFee != null ? String(r.user.monthlyFee) : "",
      totalCourseFee:
        r.user.totalCourseFee != null ? String(r.user.totalCourseFee) : "",
      paymentType: r.user.paymentType || "MONTHLY",
      installment1Amount:
        r.user.installment1Amount != null
          ? String(r.user.installment1Amount)
          : "",
      installment2Amount:
        r.user.installment2Amount != null
          ? String(r.user.installment2Amount)
          : "",
      courseDurationMonths:
        r.user.courseDurationMonths != null
          ? String(r.user.courseDurationMonths)
          : "",
      password: "",
      courseIds: r.courses.map((c) => c.id),
    });
  }

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [data, detail] = await Promise.all([
          api<Report>(`/reports/users/${params.id}`),
          api<RawUser>(`/users/${params.id}`).catch(() => null),
        ]);
        if (!cancelled) {
          const merged: Report = {
            ...data,
            user: {
              ...data.user,
              batchId: detail?.batchId ?? data.user.batchId ?? null,
              experience: detail?.experience ?? data.user.experience ?? null,
              bio: detail?.bio ?? data.user.bio ?? null,
              monthlyFee: detail?.monthlyFee ?? data.user.monthlyFee ?? null,
              totalCourseFee:
                detail?.totalCourseFee ?? data.user.totalCourseFee ?? null,
              paymentType: detail?.paymentType ?? data.user.paymentType ?? null,
              installment1Amount:
                detail?.installment1Amount ??
                data.user.installment1Amount ??
                null,
              installment2Amount:
                detail?.installment2Amount ??
                data.user.installment2Amount ??
                null,
              courseDurationMonths:
                detail?.courseDurationMonths ??
                data.user.courseDurationMonths ??
                null,
            },
          };
          setReport(merged);
          hydrateForm(merged);
        }
      } catch (reportErr) {
        try {
          const user = await api<RawUser>(`/users/${params.id}`);
          if (!cancelled) {
            const r = emptyReportFromUser(user);
            setReport(r);
            hydrateForm(r);
          }
        } catch {
          if (!cancelled) {
            setError(
              reportErr instanceof Error
                ? reportErr.message
                : "Could not load this user"
            );
          }
        }
      }
      try {
        const sch = await api<{ startTime?: string; endTime?: string }>(
          `/system/schedule/${params.id}`
        );
        if (!cancelled) {
          if (sch.startTime) setShiftStart(sch.startTime);
          if (sch.endTime) setShiftEnd(sch.endTime);
        }
      } catch {
        /* role defaults apply */
      }
      try {
        const hours = await api<{
          expectedHours: number;
          workedHours: number;
          missingHours: number;
          overtimeHours: number;
          presentDays: number;
          absentDays: number;
          leaveDays: number;
          lateArrivals: number;
          earlyDepartures: number;
          days: Array<{
            date: string;
            status: string;
            checkInAt: string | null;
            checkOutAt: string | null;
            workedHours: number;
            missingHours: number;
            expectedHours: number;
            note: string | null;
          }>;
        }>(`/attendance/staff/${params.id}/summary?period=today`);
        if (!cancelled) setHoursSummary(hours);
      } catch {
        if (!cancelled) setHoursSummary(null);
      }
      try {
        const courses = await api<Array<{ id: string; title: string }>>(
          "/courses?all=1"
        );
        if (!cancelled) {
          setCatalog(
            courses.map((c) => ({ id: c.id, title: c.title })).sort((a, b) =>
              a.title.localeCompare(b.title)
            )
          );
        }
      } catch {
        /* optional */
      }
      try {
        const batches = await api<BatchOption[]>("/users/meta/batches");
        if (!cancelled) setBatchOptions(batches);
      } catch {
        if (!cancelled) setBatchOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  if (error) {
    return (
      <div className="glass-card space-y-3 p-5">
        <p className="text-red-600">{error}</p>
        <Button asChild variant="secondary">
          <Link href="/users">Back to users</Link>
        </Button>
      </div>
    );
  }

  if (!report) {
    return <div className="p-5 text-sm text-slate-500">Loading profile…</div>;
  }

  const u = report.user;
  const isStudent = u.accountType === "STUDENT";
  const isTeacher = u.accountType === "STAFF";
  const isIntern = u.accountType === "INTERN";
  const backHref = isStudent
    ? "/students"
    : isTeacher
      ? "/staff"
      : isIntern
        ? "/interns"
        : "/users";

  async function deleteUserForever() {
    if (!params?.id || !report) return;
    const name = report.user.fullName;
    const confirmed = window.confirm(
      `Permanently delete ${name}?\n\nTheir courses, fees, attendance, chats, tasks and all account data will be wiped. They will not be able to log in again with this email/password.\n\nThis cannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await api(`/users/${params.id}`, { method: "DELETE" });
      show(`${name} deleted. All data removed.`);
      router.replace(backHref);
    } catch (e) {
      show(e instanceof Error ? e.message : "Delete failed", "error");
      setDeleting(false);
    }
  }

  async function generateTemporaryPassword() {
    if (!params?.id) return;
    if (
      !window.confirm(
        "Generate a temporary password? The user will be activated and any open invitations revoked. The password is shown once."
      )
    ) {
      return;
    }
    setTempBusy(true);
    try {
      const res = await api<{ temporaryPassword: string }>(
        `/users/${params.id}/temporary-password`,
        { method: "POST" }
      );
      setTempPassword(res.temporaryPassword);
      show("Temporary password generated");
    } catch (e) {
      show(String(e), "error");
    } finally {
      setTempBusy(false);
    }
  }

  async function saveUser(e: FormEvent) {
    e.preventDefault();
    if (!params?.id) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        accountType: form.accountType,
        status: form.status,
        phone: form.phone.trim() || null,
        track: form.track.trim() || null,
        designation: form.designation.trim() || null,
        experience: form.experience.trim() || null,
        bio: form.bio.trim() || null,
        batchId: form.batchId.trim() || null,
        courseIds: form.courseIds,
      };
      if (form.password.trim()) body.password = form.password.trim();
      if (form.accountType === "STUDENT") {
        const monthly = Number(form.monthlyFee);
        const total = Number(form.totalCourseFee);
        const months = Number(form.courseDurationMonths);
        const inst1 = Number(form.installment1Amount);
        const inst2 = Number(form.installment2Amount);
        if (form.monthlyFee.trim() !== "" && !Number.isNaN(monthly))
          body.monthlyFee = monthly;
        if (form.totalCourseFee.trim() !== "" && !Number.isNaN(total))
          body.totalCourseFee = total;
        if (form.courseDurationMonths.trim() !== "" && !Number.isNaN(months))
          body.courseDurationMonths = months;
        body.paymentType = form.paymentType;
        if (form.paymentType === "TWO_INSTALLMENTS") {
          if (form.installment1Amount.trim() !== "" && !Number.isNaN(inst1))
            body.installment1Amount = inst1;
          if (form.installment2Amount.trim() !== "" && !Number.isNaN(inst2))
            body.installment2Amount = inst2;
        }
      }
      await api(`/users/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      show("User saved");
      setEditing(false);
      setForm((f) => ({ ...f, password: "" }));
      // Reload profile
      try {
        const data = await api<Report>(`/reports/users/${params.id}`);
        setReport(data);
        hydrateForm(data);
      } catch {
        const user = await api<RawUser>(`/users/${params.id}`);
        const r = emptyReportFromUser(user);
        setReport(r);
        hydrateForm(r);
      }
    } catch (err) {
      show(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-4">
          <UserAvatar
            name={u.fullName}
            email={u.email}
            accountType={u.accountType}
            src={u.profileImage}
            size="lg"
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {roleLabel(u.accountType)} profile
            </p>
            <h1 className="text-xl font-semibold text-slate-900">{u.fullName}</h1>
            <p className="text-sm text-slate-500">{u.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{roleLabel(u.accountType)}</Badge>
              {u.status ? <Badge variant="outline">{u.status}</Badge> : null}
              {u.track ? <Badge variant="outline">{u.track}</Badge> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {u.accountType !== "SUPER_ADMIN" ? (
            <Button asChild size="sm">
              <Link href={`/inbox?userId=${encodeURIComponent(u.id)}`}>
                Chat
              </Link>
            </Button>
          ) : null}
          {isStudent ? (
            <Button asChild variant="secondary" size="sm">
              <Link href="/fees">Student fees</Link>
            </Button>
          ) : null}
          <Button asChild variant="secondary" size="sm">
            <Link href={backHref}>Back</Link>
          </Button>
          {u.accountType !== "SUPER_ADMIN" ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  hydrateForm(report);
                  setEditing((v) => !v);
                }}
              >
                {editing ? "Cancel edit" : "Edit user"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={() => void deleteUserForever()}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {editing ? (
        <form
          onSubmit={saveUser}
          className="glass-card space-y-4 p-5"
          autoComplete="off"
        >
          <div>
            <h3 className="font-semibold">Edit user</h3>
            <p className="text-xs text-slate-500">
              Name, email, type, password, track, phone &amp; course enrollments
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.accountType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountType: e.target.value }))
                }
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {roleLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value }))
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="03xx-xxxxxxx"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Track</Label>
              <Input
                value={form.track}
                onChange={(e) =>
                  setForm((f) => ({ ...f, track: e.target.value }))
                }
                placeholder="Flutter / Frontend / teaching track"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, designation: e.target.value }))
                }
              />
            </div>
            {form.accountType === "STAFF" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Instructor experience</Label>
                  <Input
                    value={form.experience}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, experience: e.target.value }))
                    }
                    placeholder="e.g. 5 years Flutter"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Instructor profile / bio</Label>
                  <Input
                    value={form.bio}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bio: e.target.value }))
                    }
                    placeholder="Short profile shown on course details"
                  />
                </div>
              </>
            ) : null}
            {form.accountType === "STUDENT" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Batch</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={form.batchId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, batchId: e.target.value }))
                    }
                  >
                    <option value="">No batch assigned</option>
                    {batchOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code}
                        {b.name ? ` — ${b.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Monthly fee (Rs)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.monthlyFee}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, monthlyFee: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Total course fee (Rs)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.totalCourseFee}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, totalCourseFee: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (months)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.courseDurationMonths}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        courseDurationMonths: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={form.paymentType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, paymentType: e.target.value }))
                    }
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="TWO_INSTALLMENTS">TWO INSTALLMENTS</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </select>
                </div>
                {form.paymentType === "TWO_INSTALLMENTS" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>Installment 1 (Rs)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.installment1Amount}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            installment1Amount: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Installment 2 (Rs)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.installment2Amount}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            installment2Amount: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                ) : null}
              </>
            ) : null}
            <div className="space-y-1.5">
              <Label>New password (optional)</Label>
              <div className="flex gap-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Leave blank to keep current"
                  minLength={8}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={tempBusy || !params?.id}
                  onClick={() => void generateTemporaryPassword()}
                >
                  {tempBusy ? "Generating…" : "Generate temporary password"}
                </Button>
                {form.status === "INVITED" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={inviteBusy || !params?.id}
                    onClick={() => {
                      setInviteBusy(true);
                      api(`/users/${params.id}/resend-invitation`, {
                        method: "POST",
                      })
                        .then(() => show("Invitation resent"))
                        .catch((e) => show(String(e), "error"))
                        .finally(() => setInviteBusy(false));
                    }}
                  >
                    {inviteBusy ? "Sending…" : "Resend invitation"}
                  </Button>
                ) : null}
              </div>
              {tempPassword ? (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                  <p className="font-semibold text-amber-900">
                    Temporary password (copy now — not shown again)
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <code className="rounded bg-white px-2 py-1 font-mono text-slate-900">
                      {tempPassword}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(tempPassword);
                        show("Copied");
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setTempPassword(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Courses (enrollment)</Label>
            <p className="text-xs text-slate-500">
              Select courses this user should be enrolled in
            </p>
            <div className="grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-slate-100 p-3 sm:grid-cols-2">
              {catalog.map((c) => {
                const checked = form.courseIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          courseIds: checked
                            ? f.courseIds.filter((id) => id !== c.id)
                            : [...f.courseIds, c.id],
                        }))
                      }
                    />
                    <span>{c.title}</span>
                  </label>
                );
              })}
              {catalog.length === 0 ? (
                <p className="text-sm text-slate-400">No courses in catalog</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                hydrateForm(report);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Attendance" value={`${report.attendancePercent}%`} />
        {isStudent ? (
          <>
            <Stat
              label="Fees pending"
              value={`Rs ${report.feesPending.toLocaleString()}`}
            />
            <Stat
              label="Fees paid"
              value={`Rs ${report.feesPaid.toLocaleString()}`}
            />
            <Stat label="Courses" value={String(report.courses.length)} />
          </>
        ) : (
          <>
            <Stat label="Open / tasks" value={String(report.tasks?.length ?? 0)} />
            <Stat label="Department" value={u.department || "-"} />
            <Stat label="Phone" value={u.phone || "-"} />
          </>
        )}
      </div>

      {!isStudent && params?.id ? (
        <div className="glass-card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Working hours</h3>
            <div className="flex flex-wrap gap-1">
              {(["today", "week", "month"] as const).map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={hoursPeriod === p ? "default" : "secondary"}
                  onClick={() => {
                    setHoursPeriod(p);
                    api<NonNullable<typeof hoursSummary>>(
                      `/attendance/staff/${params.id}/summary?period=${p}`
                    )
                      .then(setHoursSummary)
                      .catch((e) => show(String(e), "error"));
                  }}
                >
                  {p === "today" ? "Today" : p === "week" ? "Week" : "Month"}
                </Button>
              ))}
            </div>
          </div>
          {hoursSummary ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Expected"
                  value={`${hoursSummary.expectedHours}h`}
                />
                <Stat label="Worked" value={`${hoursSummary.workedHours}h`} />
                <Stat
                  label="Missing"
                  value={`${hoursSummary.missingHours}h`}
                />
                <Stat
                  label="Overtime"
                  value={`${hoursSummary.overtimeHours}h`}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm text-slate-600">
                <p>Present: {hoursSummary.presentDays}</p>
                <p>Absent: {hoursSummary.absentDays}</p>
                <p>Leave days: {hoursSummary.leaveDays}</p>
                <p>
                  Late / early: {hoursSummary.lateArrivals} /{" "}
                  {hoursSummary.earlyDepartures}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">In</th>
                      <th className="py-2 pr-3">Out</th>
                      <th className="py-2 pr-3">Worked</th>
                      <th className="py-2 pr-3">Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hoursSummary.days
                      .filter((d) => d.status !== "OFF")
                      .map((d) => (
                        <tr key={d.date} className="border-t border-slate-100">
                          <td className="py-2 pr-3">{d.date}</td>
                          <td className="py-2 pr-3">{d.status}</td>
                          <td className="py-2 pr-3">
                            {d.checkInAt
                              ? new Date(d.checkInAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                          <td className="py-2 pr-3">
                            {d.checkOutAt
                              ? new Date(d.checkOutAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                          <td className="py-2 pr-3">{d.workedHours}h</td>
                          <td className="py-2 pr-3 text-rose-600">
                            {d.missingHours}h
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              No working-hours summary yet.
            </p>
          )}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h3 className="mb-3 font-semibold">Details</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Role" value={roleLabel(u.accountType)} />
            <Row label="Status" value={u.status || "-"} />
            <Row label="Email" value={u.email} />
            <Row label="Phone" value={u.phone || "-"} />
            <Row label="Track" value={u.track || "-"} />
            <Row label="Designation" value={u.designation || "-"} />
            <Row label="Department" value={u.department || "-"} />
            <Row label="Batch" value={u.batch || "-"} />
            <Row
              label="Created"
              value={
                u.createdAt
                  ? new Date(u.createdAt).toLocaleString()
                  : "-"
              }
            />
            {isIntern ? (
              <Row
                label="Internship"
                value={
                  u.internshipStart || u.internshipEnd
                    ? `${u.internshipStart || "?"} → ${u.internshipEnd || "?"}`
                    : "-"
                }
              />
            ) : null}
            <Row
              label="Last login"
              value={
                u.lastLoginAt
                  ? new Date(u.lastLoginAt).toLocaleString()
                  : "Never"
              }
            />
            <Row
              label="Joined"
              value={
                u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"
              }
            />
          </dl>
          {u.accountType !== "SUPER_ADMIN" ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-1 text-sm font-medium text-slate-800">Password</p>
              <p className="mb-2 text-xs text-slate-500">
                Stored passwords cannot be viewed. Generate a temporary one to
                share with the user (shown once).
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={tempBusy || !params?.id}
                onClick={() => void generateTemporaryPassword()}
              >
                {tempBusy ? "Generating…" : "Generate temporary password"}
              </Button>
              {tempPassword ? (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                  <p className="font-semibold text-amber-900">
                    Temporary password (copy now — not shown again)
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <code className="rounded bg-white px-2 py-1 font-mono text-slate-900">
                      {tempPassword}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(tempPassword);
                        show("Copied");
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setTempPassword(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="glass-card space-y-4 p-5">
          <div>
            <h3 className="mb-1 font-semibold">Shift / auto checkout</h3>
            <p className="mb-3 text-xs text-slate-500">
              Overrides role default. After end time, attendance auto check-out
              (even if still at office).
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input
                  type="time"
                  className="w-[140px]"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End</Label>
                <Input
                  type="time"
                  className="w-[140px]"
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={shiftSaving || !params?.id}
                onClick={() => {
                  if (!params?.id) return;
                  setShiftSaving(true);
                  api(`/system/schedule/${params.id}`, {
                    method: "PUT",
                    body: JSON.stringify({
                      startTime: shiftStart,
                      endTime: shiftEnd,
                      active: true,
                    }),
                  })
                    .then(() => show("Shift saved"))
                    .catch((e) =>
                      show(e instanceof Error ? e.message : "Failed", "error")
                    )
                    .finally(() => setShiftSaving(false));
                }}
              >
                {shiftSaving ? "Saving…" : "Save shift"}
              </Button>
            </div>
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Recent attendance</h3>
            <ul className="space-y-2 text-sm">
              {report.recentAttendance.map((a, i) => (
                <li
                  key={`${a.date}-${i}`}
                  className="flex justify-between border-t border-slate-100 pt-2 first:border-0 first:pt-0"
                >
                  <span>
                    {a.date}
                    {a.courseTitle ? `, ${a.courseTitle}` : ""}
                  </span>
                  <span className="font-medium">{a.status}</span>
                </li>
              ))}
              {report.recentAttendance.length === 0 ? (
                <li className="text-slate-500">No attendance yet</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>

      {isStudent ? (
        <>
          <div className="glass-card p-5">
            <h3 className="mb-3 font-semibold">Courses</h3>
            <ul className="space-y-2 text-sm">
              {report.courses.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0"
                >
                  <span>
                    {c.title}
                    {c.batch ? `, ${c.batch}` : ""}
                  </span>
                  <span className="font-medium">
                    {c.progressPercent}%, {c.feeStatus || "-"}
                  </span>
                </li>
              ))}
              {report.courses.length === 0 ? (
                <li className="text-slate-500">No enrollments</li>
              ) : null}
            </ul>
          </div>
          <div className="glass-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Fee history</h3>
              <Link href="/fees" className="text-sm text-blue-600 hover:underline">
                Open fees module
              </Link>
            </div>
            <ul className="space-y-2 text-sm">
              {report.fees.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0"
                >
                  <span>
                    {f.courseTitle}, {f.month}
                  </span>
                  <span className="font-medium">
                    Rs {f.amount.toLocaleString()}, {f.status}
                  </span>
                </li>
              ))}
              {report.fees.length === 0 ? (
                <li className="text-slate-500">No fee cases</li>
              ) : null}
            </ul>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {isTeacher ? (
            <div className="glass-card p-5">
              <h3 className="mb-3 font-semibold">Taught courses</h3>
              <ul className="space-y-2 text-sm">
                {(report.taughtCourses || []).map((c) => (
                  <li
                    key={c.id}
                    className="flex justify-between border-t border-slate-100 pt-2 first:border-0 first:pt-0"
                  >
                    <span>
                      {c.title}
                      {c.batch ? `, ${c.batch}` : ""}
                    </span>
                    <span className="font-medium">
                      {c.enrolledCount} students
                    </span>
                  </li>
                ))}
                {(report.taughtCourses || []).length === 0 ? (
                  <li className="text-slate-500">
                    No courses assigned. Set Instructor on a course.
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
          {isIntern ? (
            <div className="glass-card p-5">
              <h3 className="mb-3 font-semibold">Projects</h3>
              <ul className="space-y-2 text-sm">
                {(report.projects || []).map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0"
                  >
                    <span>
                      {p.title}
                      {p.techStack ? `, ${p.techStack}` : ""}
                    </span>
                    <span className="font-medium">
                      {p.progressPercent}%, {p.status}
                    </span>
                  </li>
                ))}
                {(report.projects || []).length === 0 ? (
                  <li className="text-slate-500">No projects yet</li>
                ) : null}
              </ul>
            </div>
          ) : null}
          <div className="glass-card p-5">
            <h3 className="mb-3 font-semibold">
              {isIntern ? "Assigned tasks" : "Tasks"}
            </h3>
            <ul className="space-y-2 text-sm">
              {(report.tasks || []).map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0"
                >
                  <span>
                    <span className="font-medium text-slate-900">{t.title}</span>
                    {t.audience ? (
                      <span className="text-slate-500">, {t.audience}</span>
                    ) : null}
                    {t.dueAt ? (
                      <span className="text-slate-500">
                        {" "}
                       , due {t.dueAt.slice(0, 10)}
                      </span>
                    ) : null}
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {t.assignedBy?.trim()
                        ? `Assigned by ${t.assignedBy}`
                        : "Source: Task module (admin/teacher assigned)"}
                    </span>
                  </span>
                  <span className="font-medium">{t.status}</span>
                </li>
              ))}
              {(report.tasks || []).length === 0 ? (
                <li className="text-slate-500">No tasks yet</li>
              ) : null}
            </ul>
          </div>
          {isIntern && report.courses.length > 0 ? (
            <div className="glass-card p-5">
              <h3 className="mb-3 font-semibold">Enrolled courses</h3>
              <ul className="space-y-2 text-sm">
                {report.courses.map((c) => (
                  <li
                    key={c.id}
                    className="flex justify-between border-t border-slate-100 pt-2 first:border-0 first:pt-0"
                  >
                    <span>{c.title}</span>
                    <span className="font-medium">{c.progressPercent}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-slate-100 pt-2 first:border-0 first:pt-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
