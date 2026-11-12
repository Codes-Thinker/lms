"use client";

import { useState } from "react";
import {
  adminPaymentInfo as initialPayment,
  adminUser,
  feeRecords as initialFees,
  students,
} from "@/lib/mock-data";
import type { AdminPaymentInfo, FeeRecord } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSnackbar } from "@/components/ui/snackbar";
import { useNotifications } from "@/components/ui/notifications-provider";

function feeBadge(status: string) {
  if (status === "PAID") return <Badge variant="success">Paid / Done</Badge>;
  if (status === "SENT") return <Badge variant="warning">Screenshot sent</Badge>;
  if (status === "PARTIAL") return <Badge variant="warning">Partial</Badge>;
  return <Badge variant="danger">Due</Badge>;
}

export default function StudentsPage() {
  const list = students();
  const [fees, setFees] = useState<FeeRecord[]>(initialFees);
  const [payment, setPayment] = useState<AdminPaymentInfo>(initialPayment);
  const [selectedId, setSelectedId] = useState(initialFees[0]?.id ?? "");
  const selected = fees.find((f) => f.id === selectedId) ?? fees[0];
  const { show } = useSnackbar();
  const { push } = useNotifications();

  function sendFeeReminder(fee: FeeRecord) {
    push({
      title: "Fee reminder sent",
      body: `${fee.studentName} · Rs ${fee.amount.toLocaleString()} · ${fee.month}`,
      type: "fee",
    });
    show(`Fee reminder sent to ${fee.studentName}`);
  }

  function approvePayment(id: string) {
    const fee = fees.find((f) => f.id === id);
    setFees((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              status: "PAID",
              chat: [
                ...f.chat,
                {
                  id: `fa-${Date.now()}`,
                  senderName: adminUser.name,
                  senderRole: "ADMIN",
                  text: "Payment verified. Fee marked PAID / Done ✓",
                  sentAt: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
              ],
            }
          : f
      )
    );
    if (fee) {
      push({
        title: "Fee approved",
        body: `${fee.studentName} · Rs ${fee.amount.toLocaleString()} marked Done`,
        type: "fee",
      });
    }
    show("Payment approved · Done");
  }

  function savePaymentInfo() {
    show("Admin payment numbers saved · visible in student app");
    push({
      title: "Payment details updated",
      body: `JazzCash ${payment.jazzCash} · ${payment.adminName}`,
      type: "fee",
    });
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Students</h2>
        <p className="text-sm text-slate-500">
          Fee reminders · online payment numbers · screenshot chat approve
        </p>
      </div>

      <div className="glass-card space-y-3 p-5">
        <h3 className="font-semibold">Admin payment numbers (shown in app)</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(
            [
              ["adminName", "Admin name"],
              ["phone", "Phone"],
              ["jazzCash", "JazzCash"],
              ["easyPaisa", "EasyPaisa"],
              ["bankTitle", "Bank title"],
              ["bankAccount", "Bank account"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input
                value={payment[key]}
                onChange={(e) => setPayment({ ...payment, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <Button onClick={savePaymentInfo}>Save payment details</Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold">Student roster</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Track / Batch</th>
                <th className="px-5 py-3 font-medium">Attendance</th>
                <th className="px-5 py-3 font-medium">Report</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p>{s.track}</p>
                    <p className="text-xs text-slate-500">{s.batch}</p>
                  </td>
                  <td className="px-5 py-3.5 font-medium">{s.attendancePercent}%</td>
                  <td className="px-5 py-3.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        show(`Report opened for ${s.name}: attendance ${s.attendancePercent}%`)
                      }
                    >
                      View report
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold">Fee cases</h3>
            <p className="text-sm text-slate-500">Reminder · approve screenshot from app chat</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Course</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <tr
                    key={fee.id}
                    className={`border-t border-slate-100 ${selectedId === fee.id ? "bg-blue-50/40" : ""}`}
                  >
                    <td className="px-5 py-3.5 font-semibold">{fee.studentName}</td>
                    <td className="px-5 py-3.5">{fee.courseTitle}</td>
                    <td className="px-5 py-3.5">Rs {fee.amount.toLocaleString()}</td>
                    <td className="px-5 py-3.5">{feeBadge(fee.status)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedId(fee.id)}>
                          Open chat
                        </Button>
                        {fee.status !== "PAID" ? (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => sendFeeReminder(fee)}>
                              Remind
                            </Button>
                            <Button size="sm" onClick={() => approvePayment(fee.id)}>
                              Approve / Done
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">Cleared</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card flex flex-col overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold">Payment chat</h3>
            <p className="text-sm text-slate-500">
              {selected
                ? `${selected.studentName} · ${selected.courseTitle}`
                : "Select a fee case"}
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {selected?.chat.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl px-3 py-2 text-sm ${
                  m.senderRole === "ADMIN"
                    ? "bg-slate-100 text-slate-800"
                    : "bg-blue-600 text-white ml-6"
                }`}
              >
                <p className="text-[11px] opacity-70">
                  {m.senderName} · {m.sentAt}
                </p>
                <p className="mt-0.5">{m.text}</p>
                {m.hasScreenshot ? (
                  <p className="mt-2 rounded-lg bg-black/10 px-2 py-1 text-xs font-semibold">
                    📎 payment_screenshot.jpg
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          {selected && selected.status !== "PAID" ? (
            <div className="border-t border-slate-100 p-4">
              <Button className="w-full" onClick={() => approvePayment(selected.id)}>
                Approve screenshot · mark Done
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
