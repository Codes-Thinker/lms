"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { FeeStatusBadge } from "@/lib/fee-display";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useSnackbar } from "@/components/ui/snackbar";
import { useAdminActivity } from "@/components/ui/admin-activity-provider";
import { SearchParamsBoundary } from "@/components/ui/search-params-boundary";

type CourseTab = {
  id: string;
  title: string;
  category?: string;
};

type PendingSubmission = {
  id: string;
  amount: number;
  screenshotName?: string | null;
  createdAt: string;
  screenshotData?: string | null;
};

type FeeRow = {
  id: string;
  studentId: string;
  studentName: string;
  courseId?: string;
  courseTitle: string;
  batch?: string | null;
  courseDurationMonths?: number;
  monthlyFee?: number;
  totalCourseFee?: number;
  amountPaid?: number;
  remainingBalance?: number;
  nextPaymentDate?: string | null;
  status: string;
  dueDate?: string | null;
  reminders?: unknown[];
  hasScreenshot?: boolean;
  hasPendingScreenshot?: boolean;
  pendingSubmission?: PendingSubmission | null;
};

type FeeSubmission = {
  id: string;
  amount: number;
  status: string;
  screenshotData?: string | null;
  screenshotName?: string | null;
  createdAt: string;
  rejectionReason?: string | null;
};

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function tabLabel(c: CourseTab) {
  return c.title?.trim() || c.category?.trim() || "Course";
}

function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `Rs ${Number(n).toLocaleString()}`;
}

function FeesPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { show } = useSnackbar();
  const { refresh: refreshBadges } = useAdminActivity();

  const courseParam = searchParams.get("course") ?? "all";

  const [courses, setCourses] = useState<CourseTab[]>([]);
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [reviewFee, setReviewFee] = useState<FeeRow | null>(null);
  const [reviewShot, setReviewShot] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const replaceCourse = useCallback(
    (courseId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (courseId === "all") params.delete("course");
      else params.set("course", courseId);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const load = useCallback(async () => {
    setError(null);
    const courseId = courseParam === "all" ? "" : courseParam;
    const feePath = courseId ? `/fees?courseId=${encodeURIComponent(courseId)}` : "/fees";
    try {
      const [courseList, feeList] = await Promise.all([
        api<CourseTab[]>("/courses?all=1"),
        api<FeeRow[]>(feePath),
      ]);
      setCourses(courseList);
      setRows(feeList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      throw e;
    }
  }, [courseParam]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [load, show]);

  const pendingCount = useMemo(
    () =>
      rows.filter(
        (r) =>
          Boolean(r.hasPendingScreenshot) ||
          String(r.status || "").toUpperCase() === "SENT"
      ).length,
    [rows]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((e) => {
        if (!cancelled) show(e instanceof Error ? e.message : "Load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // Stable poll — avoid re-subscribing when pendingCount flips.
    const id = window.setInterval(() => {
      load().catch(() => {});
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [load, show]);

  const tabs = useMemo(
    () => [{ id: "all", title: "All Fees", category: "" }, ...courses],
    [courses]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.studentName || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  async function openReview(fee: FeeRow) {
    setReviewFee(fee);
    setRejectReason("");
    setReviewShot(null);
    setReviewLoading(true);
    try {
      const subs = await api<FeeSubmission[]>(`/fees/${fee.id}/submissions`);
      const pending =
        subs.find((s) => s.status === "PENDING_VERIFICATION") ?? subs[0];
      setReviewShot(pending?.screenshotData ?? null);
    } catch (e) {
      show(e instanceof Error ? e.message : "Could not load screenshot");
    } finally {
      setReviewLoading(false);
    }
  }

  async function verifyPayment(approved: boolean) {
    if (!reviewFee) return;
    setActingId(reviewFee.id);
    try {
      await api(`/fees/${reviewFee.id}/verify`, {
        method: "PATCH",
        body: JSON.stringify({
          approved,
          rejectionReason: approved
            ? undefined
            : rejectReason.trim() || "Payment could not be verified",
        }),
      });
      show(approved ? "Payment approved" : "Payment rejected");
      setReviewFee(null);
      setReviewShot(null);
      await load();
      await refreshBadges();
    } catch (e) {
      show(e instanceof Error ? e.message : "Verify failed");
    } finally {
      setActingId(null);
    }
  }

  async function patchStatus(id: string, status: string) {
    setActingId(id);
    try {
      await api(`/fees/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      show(status === "PAID" ? "Marked paid" : "Status updated");
      await load();
      await refreshBadges();
    } catch (e) {
      show(e instanceof Error ? e.message : "Update failed");
    } finally {
      setActingId(null);
    }
  }

  async function sendRemind(fee: FeeRow) {
    setActingId(fee.id);
    try {
      await api(`/fees/${fee.id}/remind`, { method: "POST", body: "{}" });
      show(`Reminder sent to ${fee.studentName}`);
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : "Reminder failed");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-semibold">Student fees</h2>
          <p className="text-sm text-slate-500">
            Balances, payment screenshots, and approvals
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendingCount > 0 ? (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              {pendingCount} awaiting review
            </Badge>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            disabled={loading}
            onClick={() => void refresh()}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="glass-card border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="glass-card space-y-4 p-5">
        <Input
          placeholder="Search by student name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = courseParam === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => replaceCourse(t.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-[#2563EB] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {t.id === "all" ? t.title : tabLabel(t)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-card table-scroll overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">ID</th>
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-5 py-3 font-medium">Batch</th>
                <th className="px-5 py-3 font-medium">Duration</th>
                <th className="px-5 py-3 font-medium">Monthly</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Paid</th>
                <th className="px-5 py-3 font-medium">Remaining</th>
                <th className="px-5 py-3 font-medium">Next payment</th>
                <th className="px-5 py-3 font-medium">Proof</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-5 py-10 text-center text-slate-500">
                    Loading fees…
                  </td>
                </tr>
              ) : null}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-5 py-10 text-center text-slate-500">
                    No fee records for this view
                  </td>
                </tr>
              ) : null}
              {filtered.map((r) => {
                const busy = actingId === r.id;
                const reminderCount = r.reminders?.length ?? 0;
                const canAct = r.status !== "PAID" && r.status !== "WAIVED";
                const needsReview =
                  r.hasPendingScreenshot ||
                  r.status === "SENT" ||
                  Boolean(r.pendingSubmission);
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/users/${r.studentId}`}
                        className="flex items-center gap-2.5 font-semibold text-slate-900 hover:text-blue-700"
                      >
                        <UserAvatar
                          name={r.studentName}
                          accountType="STUDENT"
                          size="sm"
                        />
                        {r.studentName}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                      {shortId(r.studentId)}
                    </td>
                    <td className="px-5 py-3.5">{r.courseTitle}</td>
                    <td className="px-5 py-3.5">{r.batch || "—"}</td>
                    <td className="px-5 py-3.5">
                      {r.courseDurationMonths != null
                        ? `${r.courseDurationMonths} mo`
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5">{money(r.monthlyFee)}</td>
                    <td className="px-5 py-3.5">{money(r.totalCourseFee)}</td>
                    <td className="px-5 py-3.5">{money(r.amountPaid)}</td>
                    <td className="px-5 py-3.5">{money(r.remainingBalance)}</td>
                    <td className="px-5 py-3.5">
                      {r.nextPaymentDate || r.dueDate || "—"}
                      {reminderCount > 0 ? (
                        <Badge variant="secondary" className="ml-2">
                          {reminderCount} reminder{reminderCount === 1 ? "" : "s"}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5">
                      {needsReview ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          Screenshot
                        </Badge>
                      ) : r.hasScreenshot ? (
                        <span className="text-xs text-slate-500">Attached</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <FeeStatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {needsReview ? (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => void openReview(r)}
                          >
                            Review proof
                          </Button>
                        ) : null}
                        {canAct ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => void sendRemind(r)}
                            >
                              Remind
                            </Button>
                            {!needsReview ? (
                              <>
                                <Button
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => void patchStatus(r.id, "PAID")}
                                >
                                  Mark paid
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={busy}
                                  onClick={() => void patchStatus(r.id, "WAIVED")}
                                >
                                  Mark waived
                                </Button>
                              </>
                            ) : null}
                          </>
                        ) : (
                          <Link
                            href={`/users/${r.studentId}`}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Profile
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {reviewFee ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (actingId) return;
            setReviewFee(null);
            setReviewShot(null);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Review payment proof
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {reviewFee.studentName} · {reviewFee.courseTitle}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  setReviewFee(null);
                  setReviewShot(null);
                }}
              >
                Close
              </button>
            </div>

            {reviewLoading ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Loading screenshot…
              </p>
            ) : reviewShot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={reviewShot}
                alt="Payment screenshot"
                className="mb-4 max-h-80 w-full rounded-xl border border-slate-200 object-contain bg-slate-50"
              />
            ) : (
              <div className="mb-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No screenshot attached for this submission
              </div>
            )}

            <p className="mb-3 text-sm text-slate-600">
              Amount:{" "}
              <span className="font-semibold text-slate-900">
                {money(
                  reviewFee.pendingSubmission?.amount ??
                    reviewFee.monthlyFee
                )}
              </span>
            </p>

            <Input
              placeholder="Rejection reason (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mb-4"
            />

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={actingId === reviewFee.id}
                onClick={() => void verifyPayment(true)}
              >
                Approve & mark paid
              </Button>
              <Button
                variant="secondary"
                disabled={actingId === reviewFee.id}
                onClick={() => void verifyPayment(false)}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function FeesPage() {
  return (
    <SearchParamsBoundary>
      <FeesPageInner />
    </SearchParamsBoundary>
  );
}
