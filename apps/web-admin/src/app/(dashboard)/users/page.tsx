"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { api } from "@/lib/api";
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useSnackbar } from "@/components/ui/snackbar";
import { SearchParamsBoundary } from "@/components/ui/search-params-boundary";
import { PageHeader, PageMetaPill } from "@/components/ui/page-header";
import { cacheGet, cacheGetSync, cacheSet } from "@/lib/local-db";

const USERS_CACHE_KEY = "lms_cache_users_v1";

type UserCourse = {
  id: string;
  title: string;
  batch?: string | null;
  progressPercent?: number;
  enrollmentStatus?: string;
};

type TaughtCourse = { id: string; title: string; batch?: string | null };

type UserRow = {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  accountType: string;
  status: string;
  track?: string | null;
  phone?: string | null;
  profileImage?: string | null;
  courses?: UserCourse[];
  assignedCourses?: string[];
  taughtCourses?: TaughtCourse[];
  progressPercent?: number;
  batch?: string | null;
  batchName?: string | null;
  pendingEnrollmentRequests?: number;
};

const ACCOUNT_TYPES = ["STUDENT", "INTERN", "STAFF"] as const;

const PAYMENT_TYPES = ["MONTHLY", "TWO_INSTALLMENTS", "CUSTOM"] as const;

type CourseOption = {
  id: string;
  title: string;
  category?: string;
};

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  accountType: "STUDENT" as (typeof ACCOUNT_TYPES)[number],
  track: "",
  phone: "",
  batchId: "",
};

type BatchOption = {
  id: string;
  code: string;
  name: string;
  departmentName?: string | null;
};

const emptyStudentFee = {
  courseIds: [] as string[],
  courseDurationMonths: "",
  totalCourseFee: "",
  monthlyFee: "",
  paymentType: "MONTHLY" as (typeof PAYMENT_TYPES)[number],
  installment1Amount: "",
  installment2Amount: "",
  feeStartDate: "",
  feeDueDay: "5",
};

function assignedCourseLabel(u: UserRow): string {
  if (u.assignedCourses?.length) return u.assignedCourses.join(", ");
  if (u.courses?.length) return u.courses.map((c) => c.title).join(", ");
  if (u.taughtCourses?.length) {
    return u.taughtCourses.map((c) => c.title).join(", ");
  }
  return "Not assigned";
}

function displayOrNone(value?: string | null) {
  const v = (value || "").trim();
  return v || "Not set";
}

type RoleTab = "ALL" | "STUDENT" | "STAFF" | "INTERN";

type CourseTab = { id: string; title: string; batch?: string | null };

/** Courses linked to a user (enrolled for students, taught for teachers). */
function userCourseTabs(u: UserRow): CourseTab[] {
  if (u.accountType === "STAFF" && u.taughtCourses?.length) {
    return u.taughtCourses.map((c) => ({
      id: c.id,
      title: c.title,
      batch: c.batch,
    }));
  }
  if (u.courses?.length) {
    return u.courses.map((c) => ({
      id: c.id,
      title: c.title,
      batch: c.batch,
    }));
  }
  if (u.assignedCourses?.length) {
    return u.assignedCourses.map((title) => ({
      id: `title:${title}`,
      title,
    }));
  }
  return [];
}

function userMatchesCourse(u: UserRow, courseId: string): boolean {
  if (courseId === "all") return true;
  if (courseId === "unassigned") return userCourseTabs(u).length === 0;
  return userCourseTabs(u).some(
    (c) => c.id === courseId || `title:${c.title}` === courseId
  );
}

function tabChip(active: boolean) {
  return cn(
    "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
    active
      ? "bg-[#2563EB] text-white"
      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
  );
}

function UsersPageInner() {
  const { show } = useSnackbar();
  const searchParams = useSearchParams();
  const qFromUrl = (searchParams.get("q") || "").trim();
  const [items, setItems] = useState<UserRow[]>(() => cacheGetSync<UserRow[]>(USERS_CACHE_KEY) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [studentFee, setStudentFee] = useState(emptyStudentFee);
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [batchOptions, setBatchOptions] = useState<BatchOption[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [q, setQ] = useState(qFromUrl);
  const [roleTab, setRoleTab] = useState<RoleTab>("ALL");
  const [courseTab, setCourseTab] = useState("all");

  const load = useCallback(async (searchQ?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ pageSize: "200" });
      const term = (searchQ ?? q).trim();
      if (term) params.set("q", term);
      const r = await api<{ items: UserRow[] }>(`/users?${params.toString()}`);
      setItems(r.items);
      await cacheSet(USERS_CACHE_KEY, r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    setQ(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    void cacheGet<UserRow[]>(USERS_CACHE_KEY).then((cached) => {
      if (cached?.data?.length) setItems(cached.data);
    });
    void load(qFromUrl);
    api<CourseOption[]>("/courses?all=1")
      .then(setCourseOptions)
      .catch(() => setCourseOptions([]));
    api<BatchOption[]>("/users/meta/batches")
      .then(setBatchOptions)
      .catch(() => setBatchOptions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qFromUrl]);

  useEffect(() => {
    if (form.accountType !== "STUDENT") return;
    const monthly = Number(studentFee.monthlyFee);
    const months = Number(studentFee.courseDurationMonths);
    if (monthly > 0 && months > 0) {
      setStudentFee((prev) => ({
        ...prev,
        totalCourseFee: String(Math.round(monthly * months)),
      }));
    }
  }, [form.accountType, studentFee.monthlyFee, studentFee.courseDurationMonths]);

  const suggestedTotal = useMemo(() => {
    const monthly = Number(studentFee.monthlyFee);
    const months = Number(studentFee.courseDurationMonths);
    if (monthly > 0 && months > 0) return monthly * months;
    return null;
  }, [studentFee.monthlyFee, studentFee.courseDurationMonths]);

  const roleCounts = useMemo(() => {
    const counts = { ALL: items.length, STUDENT: 0, STAFF: 0, INTERN: 0 };
    for (const u of items) {
      if (u.accountType === "STUDENT") counts.STUDENT += 1;
      else if (u.accountType === "STAFF") counts.STAFF += 1;
      else if (u.accountType === "INTERN") counts.INTERN += 1;
    }
    return counts;
  }, [items]);

  const roleFiltered = useMemo(() => {
    if (roleTab === "ALL") return items;
    return items.filter((u) => u.accountType === roleTab);
  }, [items, roleTab]);

  const courseTabs = useMemo(() => {
    if (roleTab !== "STUDENT" && roleTab !== "STAFF") return [] as CourseTab[];
    const map = new Map<string, CourseTab>();
    let unassigned = 0;
    for (const u of roleFiltered) {
      const courses = userCourseTabs(u);
      if (courses.length === 0) {
        unassigned += 1;
        continue;
      }
      for (const c of courses) {
        if (!map.has(c.id)) map.set(c.id, c);
      }
    }
    const list: CourseTab[] = [
      { id: "all", title: "All courses" },
      ...Array.from(map.values()).sort((a, b) =>
        a.title.localeCompare(b.title)
      ),
    ];
    if (unassigned > 0) {
      list.push({
        id: "unassigned",
        title: roleTab === "STAFF" ? "No course assigned" : "Not enrolled",
      });
    }
    return list;
  }, [roleFiltered, roleTab]);

  const visibleUsers = useMemo(() => {
    if (roleTab !== "STUDENT" && roleTab !== "STAFF") return roleFiltered;
    return roleFiltered.filter((u) => userMatchesCourse(u, courseTab));
  }, [roleFiltered, roleTab, courseTab]);

  function selectRole(next: RoleTab) {
    setRoleTab(next);
    setCourseTab("all");
  }

  function setField<K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setStudentFee(emptyStudentFee);
    setShowPassword(false);
  }

  function toggleCourseId(id: string) {
    setStudentFee((prev) => {
      const has = prev.courseIds.includes(id);
      return {
        ...prev,
        courseIds: has
          ? prev.courseIds.filter((x) => x !== id)
          : [...prev.courseIds, id],
      };
    });
  }

  function numOrUndefined(v: string): number | undefined {
    const n = Number(v);
    return v.trim() !== "" && !Number.isNaN(n) ? n : undefined;
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        accountType: form.accountType,
        track: form.track.trim() || undefined,
        phone: form.phone.trim() || undefined,
        password: form.password.trim() || undefined,
        sendInvitation: !form.password.trim(),
      };
      if (form.accountType === "STUDENT") {
        if (form.batchId.trim()) body.batchId = form.batchId.trim();
        if (studentFee.courseIds.length) body.courseIds = studentFee.courseIds;
        const monthlyFee = numOrUndefined(studentFee.monthlyFee);
        const totalCourseFee = numOrUndefined(studentFee.totalCourseFee);
        const courseDurationMonths = numOrUndefined(studentFee.courseDurationMonths);
        const installment1Amount = numOrUndefined(studentFee.installment1Amount);
        const installment2Amount = numOrUndefined(studentFee.installment2Amount);
        const feeDueDay = numOrUndefined(studentFee.feeDueDay);
        if (monthlyFee !== undefined) body.monthlyFee = monthlyFee;
        if (totalCourseFee !== undefined) body.totalCourseFee = totalCourseFee;
        if (courseDurationMonths !== undefined)
          body.courseDurationMonths = courseDurationMonths;
        body.paymentType = studentFee.paymentType;
        if (studentFee.paymentType === "TWO_INSTALLMENTS") {
          if (installment1Amount !== undefined)
            body.installment1Amount = installment1Amount;
          if (installment2Amount !== undefined)
            body.installment2Amount = installment2Amount;
        }
        if (studentFee.feeStartDate.trim())
          body.feeStartDate = studentFee.feeStartDate.trim();
        if (feeDueDay !== undefined) body.feeDueDay = feeDueDay;
      }
      await api("/users", {
        method: "POST",
        body: JSON.stringify(body),
      });
      resetForm();
      show("User created");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save user";
      show(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Live user directory with admin-side filters. Add Student, Intern, or Teacher."
        icon={Users}
        meta={<PageMetaPill label="Total" value={items.length} />}
        actions={
          <form
            className="flex w-full max-w-md gap-2 sm:w-auto"
            onSubmit={(e) => {
              e.preventDefault();
              void load(q);
            }}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email or phone"
              className="h-10 rounded-lg bg-white"
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        }
      />
      {error ? (
        <p className="text-sm text-red-600">
          {error}
          {error.toLowerCase().includes("unauthorized") ||
          error.toLowerCase().includes("session")
            ? " Sign in again from /login."
            : null}
        </p>
      ) : null}

      <form
        onSubmit={onCreate}
        className="glass-card relative space-y-4 overflow-hidden p-5"
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore="true"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[#1C1410]">Add new user</h3>
            <p className="text-sm text-[#1C1410]/55">
              Empty form: enter the new person&apos;s details only
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={resetForm}
          >
            Clear form
          </Button>
        </div>

        {/* Honeypots stay out of space-y flow so they don't create empty gaps */}
        <div className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
          <input type="text" name="username" autoComplete="username" tabIndex={-1} defaultValue="" />
          <input type="password" name="password" autoComplete="current-password" tabIndex={-1} defaultValue="" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-user-name">Full name</Label>
            <Input
              id="new-user-name"
              name="new-user-full-name"
              value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              placeholder="e.g. Ali Khan"
              required
              minLength={2}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-email">Email</Label>
            <Input
              id="new-user-email"
              name="new-user-email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="name@codesthinker.com"
              required
              autoComplete="off"
              inputMode="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-type">Account type</Label>
            <select
              id="new-user-type"
              name="new-user-account-type"
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              value={form.accountType}
              onChange={(e) =>
                setField(
                  "accountType",
                  e.target.value as (typeof ACCOUNT_TYPES)[number]
                )
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
            <Label htmlFor="new-user-password">
              Password{" "}
              <span className="font-normal text-[#1C1410]/45">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="new-user-password"
                name="new-user-password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                minLength={8}
                placeholder="Leave blank to send invite"
                autoComplete="new-password"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </Button>
            </div>
            <p className="text-xs text-[#1C1410]/50">
              Blank password = invitation email. Set password for instant login.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-track">
              Track <span className="font-normal text-[#1C1410]/45">(optional)</span>
            </Label>
            <Input
              id="new-user-track"
              name="new-user-track"
              value={form.track}
              onChange={(e) => setField("track", e.target.value)}
              placeholder="e.g. Flutter Development"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-phone">
              Phone <span className="font-normal text-[#1C1410]/45">(optional)</span>
            </Label>
            <Input
              id="new-user-phone"
              name="new-user-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="03xx-xxxxxxx"
              autoComplete="off"
            />
          </div>
        </div>

        {form.accountType === "STUDENT" ? (
          <div className="space-y-3 rounded-2xl border border-white/35 bg-white/25 p-4">
            <div className="space-y-1">
              <h4 className="font-semibold text-[#1C1410]">Enrollment &amp; fees</h4>
              <p className="text-xs text-[#1C1410]/55">
                Optional: configure course access and payment plan at signup
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="student-batch">Batch</Label>
              <select
                id="student-batch"
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={form.batchId}
                onChange={(e) => setField("batchId", e.target.value)}
              >
                <option value="">No batch assigned</option>
                {batchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code}
                    {b.name ? ` — ${b.name}` : ""}
                    {b.departmentName ? ` (${b.departmentName})` : ""}
                  </option>
                ))}
              </select>
              {batchOptions.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No batches found. Create batches in the system first.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Courses</Label>
              {courseOptions.length === 0 ? (
                <p className="text-xs text-slate-500">No courses loaded</p>
              ) : (
                <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
                  {courseOptions.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={studentFee.courseIds.includes(c.id)}
                        onChange={() => toggleCourseId(c.id)}
                        className="rounded border-slate-300"
                      />
                      <span>{c.title || c.category}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="student-duration">Duration (months)</Label>
                <Input
                  id="student-duration"
                  type="number"
                  min={1}
                  value={studentFee.courseDurationMonths}
                  onChange={(e) =>
                    setStudentFee((p) => ({
                      ...p,
                      courseDurationMonths: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-monthly">Monthly fee (Rs)</Label>
                <Input
                  id="student-monthly"
                  type="number"
                  min={0}
                  value={studentFee.monthlyFee}
                  onChange={(e) =>
                    setStudentFee((p) => ({ ...p, monthlyFee: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="student-total">Total course fee (Rs)</Label>
                <Input
                  id="student-total"
                  type="number"
                  min={0}
                  value={studentFee.totalCourseFee}
                  onChange={(e) =>
                    setStudentFee((p) => ({
                      ...p,
                      totalCourseFee: e.target.value,
                    }))
                  }
                />
                {suggestedTotal != null ? (
                  <p className="text-xs text-slate-500">
                    Suggested: Rs {suggestedTotal.toLocaleString()} (monthly ×
                    duration)
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-payment-type">Payment type</Label>
                <select
                  id="student-payment-type"
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  value={studentFee.paymentType}
                  onChange={(e) =>
                    setStudentFee((p) => ({
                      ...p,
                      paymentType: e.target.value as (typeof PAYMENT_TYPES)[number],
                    }))
                  }
                >
                  {PAYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-fee-start">Fee start date</Label>
                <Input
                  id="student-fee-start"
                  type="date"
                  value={studentFee.feeStartDate}
                  onChange={(e) =>
                    setStudentFee((p) => ({ ...p, feeStartDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-fee-due">Fee due day of month</Label>
                <Input
                  id="student-fee-due"
                  type="number"
                  min={1}
                  max={28}
                  value={studentFee.feeDueDay}
                  onChange={(e) =>
                    setStudentFee((p) => ({ ...p, feeDueDay: e.target.value }))
                  }
                />
              </div>
              {studentFee.paymentType === "TWO_INSTALLMENTS" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="student-inst1">Installment 1 (Rs)</Label>
                    <Input
                      id="student-inst1"
                      type="number"
                      min={0}
                      value={studentFee.installment1Amount}
                      onChange={(e) =>
                        setStudentFee((p) => ({
                          ...p,
                          installment1Amount: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="student-inst2">Installment 2 (Rs)</Label>
                    <Input
                      id="student-inst2"
                      type="number"
                      min={0}
                      value={studentFee.installment2Amount}
                      onChange={(e) =>
                        setStudentFee((p) => ({
                          ...p,
                          installment2Amount: e.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create user"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={resetForm}
          >
            Reset
          </Button>
        </div>
      </form>

      <div className="glass-card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Browse by category</h3>
            <p className="text-xs text-slate-500">
              Filter role, then course: students by enrollment, teachers by
              courses they teach
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void load()}
          >
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ALL", "All", roleCounts.ALL],
              ["STUDENT", "Students", roleCounts.STUDENT],
              ["STAFF", "Teachers", roleCounts.STAFF],
              ["INTERN", "Interns", roleCounts.INTERN],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => selectRole(id)}
              className={tabChip(roleTab === id)}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {courseTabs.length > 0 ? (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {roleTab === "STAFF" ? "Teacher courses" : "Student courses"}
            </p>
            <div className="flex flex-wrap gap-2">
              {courseTabs.map((t) => {
                const count =
                  t.id === "all"
                    ? roleFiltered.length
                    : roleFiltered.filter((u) => userMatchesCourse(u, t.id))
                        .length;
                const label =
                  t.id === "all" || t.id === "unassigned"
                    ? t.title
                    : t.batch
                      ? `${t.title}, ${t.batch}`
                      : t.title;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCourseTab(t.id)}
                    className={tabChip(courseTab === t.id)}
                    title={label}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="glass-card table-scroll overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold">
            {roleTab === "ALL"
              ? "All users"
              : roleTab === "STUDENT"
                ? "Students"
                : roleTab === "STAFF"
                  ? "Teachers"
                  : "Interns"}{" "}
            {loading ? "…" : `(${visibleUsers.length})`}
          </h3>
          <p className="text-xs text-slate-500">
            {roleTab === "STUDENT" && courseTab !== "all"
              ? "Filtered by enrolled course"
              : roleTab === "STAFF" && courseTab !== "all"
                ? "Filtered by taught course"
                : "Tap a name for full profile"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Full name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">
                  {roleTab === "STAFF" ? "Teaches" : "Assigned course(s)"}
                </th>
                <th className="px-5 py-3 font-medium">Batch</th>
                <th className="px-5 py-3 font-medium">Progress</th>
                <th className="px-5 py-3 font-medium">Enrollment</th>
                <th className="px-5 py-3 font-medium">Account status</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => {
                const display = u.name || u.fullName || u.email;
                const batch = displayOrNone(u.batch || u.batchName);
                const coursesLabel = assignedCourseLabel(u);
                const progress =
                  u.progressPercent !== undefined
                    ? `${u.progressPercent}%`
                    : "0%";
                return (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/users/${u.id}`}
                        className="flex items-center gap-2.5 hover:text-blue-700"
                      >
                        <UserAvatar
                          name={display}
                          email={u.email}
                          accountType={u.accountType}
                          src={u.profileImage}
                          size="sm"
                        />
                        <span className="font-semibold">{display}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="secondary">
                        {roleLabel(u.accountType)}
                      </Badge>
                    </td>
                    <td
                      className={cn(
                        "max-w-[200px] truncate px-5 py-3.5",
                        coursesLabel === "Not assigned" && "text-slate-400"
                      )}
                      title={coursesLabel}
                    >
                      {coursesLabel}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3.5",
                        batch === "Not set" && "text-slate-400"
                      )}
                    >
                      {batch}
                    </td>
                    <td className="px-5 py-3.5">{progress}</td>
                    <td className="px-5 py-3.5">
                      {u.courses?.length ? (
                        <Badge variant="success">Enrolled</Badge>
                      ) : (u.pendingEnrollmentRequests ?? 0) > 0 ? (
                        <Badge variant="warning">
                          {u.pendingEnrollmentRequests} pending
                        </Badge>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline">{u.status}</Badge>
                    </td>
                  </tr>
                );
              })}
              {!loading && visibleUsers.length === 0 && !error ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    No users in this category
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <SearchParamsBoundary>
      <UsersPageInner />
    </SearchParamsBoundary>
  );
}
