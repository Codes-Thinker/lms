"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSnackbar } from "@/components/ui/snackbar";
import { useAdminActivity } from "@/components/ui/admin-activity-provider";
import { SearchParamsBoundary } from "@/components/ui/search-params-boundary";
import { cn } from "@/lib/utils";

type LeaveRow = {
  id: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  batch: string | null;
  courseTitle: string | null;
  leaveDate: string;
  durationDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  rejectionReason: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type LeaveStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

function LeavePageInner() {
  const { show } = useSnackbar();
  const searchParams = useSearchParams();
  const focusLeaveId = searchParams.get("leaveId");
  const { refresh: refreshActivity } = useAdminActivity();
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [status, setStatus] = useState("ALL");
  const [batch, setBatch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(focusLeaveId);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (status && status !== "ALL") q.set("status", status);
      if (batch.trim()) q.set("batch", batch.trim());
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      const [list, st] = await Promise.all([
        api<LeaveRow[]>(`/leave?${q.toString()}`),
        api<LeaveStats>("/leave/stats"),
      ]);
      setRows(list);
      setStats(st);
      void refreshActivity();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leave requests");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [status, batch, from, to, refreshActivity]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (focusLeaveId) setHighlightId(focusLeaveId);
  }, [focusLeaveId]);

  useEffect(() => {
    function onLeaveUpdated() {
      void load({ silent: true });
    }
    window.addEventListener("lms:leave-updated", onLeaveUpdated);
    return () => window.removeEventListener("lms:leave-updated", onLeaveUpdated);
  }, [load]);

  useEffect(() => {
    if (!highlightId || !rows.length) return;
    const el = document.getElementById(`leave-row-${highlightId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, rows]);

  const batches = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.batch) set.add(r.batch);
    }
    return Array.from(set).sort();
  }, [rows]);

  async function approve(id: string) {
    const ok = window.confirm("Approve this leave request?");
    if (!ok) return;
    setBusyId(id);
    try {
      await api(`/leave/${id}/approve`, { method: "PATCH" });
      show("Leave approved", "success");
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : "Approve failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function reject() {
    if (!rejectId) return;
    if (rejectReason.trim().length < 3) {
      show("Enter a rejection reason", "error");
      return;
    }
    const ok = window.confirm("Reject this leave request?");
    if (!ok) return;
    setBusyId(rejectId);
    try {
      await api(`/leave/${rejectId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ rejectionReason: rejectReason.trim() }),
      });
      show("Leave rejected", "success");
      setRejectId(null);
      setRejectReason("");
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : "Reject failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  function statusBadge(s: string) {
    const u = s.toUpperCase();
    if (u === "APPROVED") return <Badge variant="success">Approved</Badge>;
    if (u === "REJECTED") return <Badge variant="danger">Rejected</Badge>;
    return <Badge variant="warning">Pending</Badge>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total requests", value: stats?.total ?? "—" },
          { label: "Pending", value: stats?.pending ?? "—" },
          { label: "Approved", value: stats?.approved ?? "—" },
          { label: "Rejected", value: stats?.rejected ?? "—" },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {c.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">Status</label>
          <select
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">All requests</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">Batch</label>
          <Input
            list="leave-batches"
            placeholder="Filter batch"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            className="h-10 w-40"
          />
          <datalist id="leave-batches">
            {batches.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">From</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">To</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Batch / Course</th>
                <th className="px-4 py-3">Leave</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    id={`leave-row-${r.id}`}
                    className={cn(
                      "border-t border-slate-100",
                      highlightId === r.id && "bg-amber-50 ring-2 ring-inset ring-amber-300"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {r.studentName ?? "—"}
                      </div>
                      <div className="text-xs text-slate-400">{r.studentEmail ?? r.studentId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{r.batch ?? "—"}</div>
                      <div className="text-xs text-slate-400">
                        {r.courseTitle ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.leaveDate}</div>
                      <div className="text-xs text-slate-400">
                        {r.durationDays} day(s)
                      </div>
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-slate-600">
                      {r.reason}
                      {r.rejectionReason && (
                        <div className="mt-1 text-xs text-rose-600">
                          Rejected: {r.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3">
                      {r.status === "PENDING" ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void approve(r.id)}
                            className={cn(
                              "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white",
                              busyId === r.id && "opacity-60"
                            )}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => {
                              setRejectId(r.id);
                              setRejectReason("");
                            }}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {r.reviewedByName
                            ? `By ${r.reviewedByName}`
                            : "Reviewed"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Reject leave</h3>
            <p className="mt-1 text-sm text-slate-500">
              Provide a reason the student will see.
            </p>
            <textarea
              className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600"
                onClick={() => setRejectId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void reject()}
              >
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeavePage() {
  return (
    <SearchParamsBoundary>
      <LeavePageInner />
    </SearchParamsBoundary>
  );
}
