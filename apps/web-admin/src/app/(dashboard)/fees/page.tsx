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
};

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function tabLabel(c: CourseTab) {
  return c.title?.trim() || c.category?.trim() || "Course";
}

function money(n: number | undefined) {
  if (n === undefined || Number.isNaN(n)) return "—";
  return `Rs ${n.toLocaleString()}`;
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

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) => show(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
    const id = window.setInterval(() => {
      load().catch(() => {});
    }, 30000);
    return () => window.clearInterval(id);
  }, [load, show]);

  const tabs = useMemo(
    () => [{ id: "all", title: "All Fees", category: "" }, ...courses],
    [courses]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.studentName.toLowerCase().includes(q));
  }, [rows, search]);

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
            Balances, reminders, and payment status
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={() => void refresh()}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
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
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-5 py-10 text-center text-slate-500">
                    Loading fees…
                  </td>
                </tr>
              ) : null}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-5 py-10 text-center text-slate-500">
                    No fee records for this view
                  </td>
                </tr>
              ) : null}
              {filtered.map((r) => {
                const busy = actingId === r.id;
                const reminderCount = r.reminders?.length ?? 0;
                const canAct = r.status !== "PAID" && r.status !== "WAIVED";
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
                      <FeeStatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
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