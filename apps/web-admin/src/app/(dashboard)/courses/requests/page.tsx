"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/components/ui/snackbar";
import { cn } from "@/lib/utils";

type EnrollmentRequestRow = {
  id: string;
  status: string;
  note?: string | null;
  adminNote?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  student: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    batchLabel?: string | null;
  };
};

const TABS = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
] as const;

function statusBadge(status: string) {
  if (status === "APPROVED") return <Badge variant="success">Approved</Badge>;
  if (status === "REJECTED") return <Badge variant="danger">Rejected</Badge>;
  if (status === "PENDING") return <Badge variant="warning">Pending</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

export default function EnrollmentRequestsPage() {
  const { show } = useSnackbar();
  const [tab, setTab] = useState<string>("");
  const [rows, setRows] = useState<EnrollmentRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = tab ? `?status=${encodeURIComponent(tab)}` : "";
      const data = await api<EnrollmentRequestRow[]>(
        `/courses/enrollment-requests${qs}`
      );
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const all = rows.length;
    return { all, shown: rows.length };
  }, [rows]);

  async function review(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      await api(`/courses/enrollment-requests/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      show(action === "approve" ? "Enrollment approved" : "Request rejected");
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : "Action failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Enrollment requests</h2>
        <p className="text-sm text-slate-500">
          Students ask to join courses — approve or reject pending requests
        </p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key || "all"}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-blue-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {t.label}
          </button>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="ml-auto"
          onClick={() => void load()}
        >
          Refresh
        </Button>
      </div>

      <div className="glass-card table-scroll overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
          {loading ? "Loading…" : `${counts.shown} request(s)`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Requested</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/users/${r.student.id}`}
                      className="font-semibold text-slate-900 hover:text-blue-700"
                    >
                      {r.student.name || r.student.email}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{r.student.email}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-medium">{r.course.title}</span>
                    {r.course.batchLabel ? (
                      <span className="block text-xs text-slate-500">
                        {r.course.batchLabel}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3.5">{statusBadge(r.status)}</td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.status === "PENDING" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={busyId === r.id}
                          onClick={() => void review(r.id, "approve")}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyId === r.id}
                          onClick={() => void review(r.id, "reject")}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    No enrollment requests
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