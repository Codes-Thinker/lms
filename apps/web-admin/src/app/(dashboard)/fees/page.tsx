"use client";

import { useMemo, useState } from "react";
import { feeRecords as initialFees } from "@/lib/mock-data";
import type { FeeRecord } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/components/ui/snackbar";
import { useNotifications } from "@/components/ui/notifications-provider";

function feeBadge(status: string) {
  if (status === "PAID") return <Badge variant="success">Paid</Badge>;
  if (status === "SENT") return <Badge variant="warning">Screenshot · pending approve</Badge>;
  if (status === "PARTIAL") return <Badge variant="warning">Partial</Badge>;
  return <Badge variant="danger">Due</Badge>;
}

export default function FeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>(initialFees);
  const { show } = useSnackbar();
  const { push } = useNotifications();

  const stats = useMemo(() => {
    const pending = fees.filter((f) => f.status !== "PAID");
    const paid = fees.filter((f) => f.status === "PAID");
    const awaiting = fees.filter((f) => f.status === "SENT");
    const pendingAmount = pending.reduce((s, f) => s + f.amount, 0);
    const paidAmount = paid.reduce((s, f) => s + f.amount, 0);
    return {
      pendingCount: pending.length,
      awaitingCount: awaiting.length,
      paidCount: paid.length,
      pendingAmount,
      paidAmount,
      totalAmount: fees.reduce((s, f) => s + f.amount, 0),
    };
  }, [fees]);

  function markPaid(id: string) {
    const fee = fees.find((f) => f.id === id);
    if (!fee || fee.status === "PAID") return;
    setFees((prev) => prev.map((f) => (f.id === id ? { ...f, status: "PAID" } : f)));
    push({
      title: "Fee received · marked paid",
      body: `${fee.studentName} · Rs ${fee.amount.toLocaleString()}`,
      type: "fee",
    });
    show(`Marked paid · pending count down · Rs ${fee.amount.toLocaleString()}`);
  }

  function markIncoming(id: string) {
    const fee = fees.find((f) => f.id === id);
    if (!fee || fee.status === "PAID") return;
    setFees((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              status: "SENT",
              chat: [
                ...f.chat,
                {
                  id: `in-${Date.now()}`,
                  senderName: fee.studentName,
                  senderRole: "STUDENT",
                  text: "Payment received in app · screenshot submitted",
                  sentAt: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  hasScreenshot: true,
                },
              ],
            }
          : f
      )
    );
    push({
      title: "Fee aagai hai (APP)",
      body: `${fee.studentName} · Rs ${fee.amount.toLocaleString()} · approve karein`,
      type: "fee",
    });
    show(`Fee aagai · ${fee.studentName} · Rs ${fee.amount.toLocaleString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Fees desk</h2>
        <p className="text-sm text-slate-500">
          App se jab fee aaye foran yahan dikhe · mark paid → pending count kam
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-sm text-slate-500">Pending amount</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            Rs {stats.pendingAmount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-400">{stats.pendingCount} open case(s)</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-500">Awaiting approve</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">{stats.awaitingCount}</p>
          <p className="mt-1 text-xs text-slate-400">Screenshot sent from app</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-500">Paid / cleared</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            Rs {stats.paidAmount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-400">{stats.paidCount} cleared</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-500">All fee records</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            Rs {stats.totalAmount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-400">{fees.length} total</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold">Fee ledger</h3>
          <p className="text-sm text-slate-500">Clear numbers · mark paid to reduce pending</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-5 py-3 font-medium">Month</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => (
                <tr key={fee.id} className="border-t border-slate-100">
                  <td className="px-5 py-3.5 font-semibold">{fee.studentName}</td>
                  <td className="px-5 py-3.5">{fee.courseTitle}</td>
                  <td className="px-5 py-3.5">{fee.month}</td>
                  <td className="px-5 py-3.5 font-bold">Rs {fee.amount.toLocaleString()}</td>
                  <td className="px-5 py-3.5">{feeBadge(fee.status)}</td>
                  <td className="px-5 py-3.5">
                    {fee.status === "PAID" ? (
                      <span className="text-xs font-medium text-emerald-600">Cleared ✓</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {fee.status !== "SENT" ? (
                          <Button size="sm" variant="secondary" onClick={() => markIncoming(fee.id)}>
                            Fee aagai (APP)
                          </Button>
                        ) : null}
                        <Button size="sm" onClick={() => markPaid(fee.id)}>
                          Mark paid
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
