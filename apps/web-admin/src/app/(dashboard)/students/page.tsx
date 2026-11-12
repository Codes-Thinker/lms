"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AdminPaymentInfo, FeeRecord } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSnackbar } from "@/components/ui/snackbar";
import { useNotifications } from "@/components/ui/notifications-provider";
import { UserAvatar } from "@/components/ui/user-avatar";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  track?: string | null;
  batch?: string | null;
};

function feeBadge(status: string) {
  if (status === "PAID") return <Badge variant="success">Paid / Done</Badge>;
  if (status === "SENT") return <Badge variant="warning">Screenshot sent</Badge>;
  if (status === "PARTIAL") return <Badge variant="warning">Partial</Badge>;
  return <Badge variant="danger">Due</Badge>;
}

export default function StudentsPage() {
  const [list, setList] = useState<StudentRow[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payment, setPayment] = useState<AdminPaymentInfo>({
    adminName: "",
    phone: "",
    jazzCash: "",
    easyPaisa: "",
    bankTitle: "",
    bankAccount: "",
  });
  const [selectedId, setSelectedId] = useState("");
  const [reports, setReports] = useState<Record<string, number>>({});
  const { show } = useSnackbar();
  const { push } = useNotifications();
  const selected = fees.find((f) => f.id === selectedId) ?? fees[0];

  async function refresh() {
    const [users, feeList, pay] = await Promise.all([
      api<{ items: Array<Record<string, unknown>> }>("/users?accountType=STUDENT&pageSize=100"),
      api<FeeRecord[]>("/fees"),
      api<AdminPaymentInfo | null>("/system/payment-info"),
    ]);
    const students = users.items.map((u) => ({
      id: String(u.id),
      name: String(u.name || u.fullName || ""),
      email: String(u.email || ""),
      track: (u.track as string) || null,
      batch:
        typeof u.batch === "string"
          ? u.batch
          : ((u.batch as { code?: string } | null)?.code ?? null),
    }));
    setList(students);
    setFees(feeList);
    if (pay) setPayment(pay);
    if (!selectedId && feeList[0]) setSelectedId(feeList[0].id);

    const attMap: Record<string, number> = {};
    await Promise.all(
      students.slice(0, 12).map(async (s) => {
        try {
          const r = await api<{ attendancePercent: number }>(`/reports/users/${s.id}`);
          attMap[s.id] = r.attendancePercent;
        } catch {
          attMap[s.id] = 0;
        }
      })
    );
    setReports(attMap);
  }

  useEffect(() => {
    refresh().catch((e) => show(e instanceof Error ? e.message : "Load failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendFeeReminder(fee: FeeRecord) {
    await api(`/fees/${fee.id}/remind`, { method: "POST", body: "{}" });
    push({
      title: "Fee reminder sent",
      body: `${fee.studentName} · Rs ${fee.amount.toLocaleString()} · ${fee.month}`,
      type: "fee",
    });
    show(`Fee reminder sent to ${fee.studentName}`);
    await refresh();
  }

  async function approvePayment(id: string) {
    await api(`/fees/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "PAID" }),
    });
    show("Payment approved · Done");
    await refresh();
  }

  async function savePaymentInfo() {
    await api("/system/payment-info", {
      method: "PUT",
      body: JSON.stringify(payment),
    });
    show("Admin payment numbers saved · visible in student app");
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Students</h2>
        <p className="text-sm text-slate-500">
          Live roster · fee chat · open full progress report
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
                value={payment[key] ?? ""}
                onChange={(e) => setPayment({ ...payment, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <Button onClick={() => savePaymentInfo().catch((e) => show(String(e)))}>
          Save payment details
        </Button>
      </div>

      <div className="glass-card table-scroll overflow-hidden">
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
                    <Link
                      href={`/users/${s.id}`}
                      className="flex items-center gap-2.5 hover:text-blue-700"
                    >
                      <UserAvatar
                        name={s.name}
                        email={s.email}
                        accountType="STUDENT"
                        size="sm"
                      />
                      <span>
                        <span className="block font-semibold">{s.name}</span>
                        <span className="block text-xs text-slate-500">
                          {s.email}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <p>{s.track ?? "—"}</p>
                    <p className="text-xs text-slate-500">{s.batch ?? "—"}</p>
                  </td>
                  <td className="px-5 py-3.5 font-medium">
                    {reports[s.id] != null ? `${reports[s.id]}%` : "…"}
                  </td>
                  <td className="px-5 py-3.5">
                    <Button size="sm" variant="secondary" asChild>
                      <Link href={`/users/${s.id}`}>Open profile</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card table-scroll overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold">Fee cases</h3>
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
                    className={`border-t border-slate-100 ${
                      selectedId === fee.id ? "bg-blue-50/40" : ""
                    }`}
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
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                sendFeeReminder(fee).catch((e) => show(String(e)))
                              }
                            >
                              Remind
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                approvePayment(fee.id).catch((e) => show(String(e)))
                              }
                            >
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
            {selected?.chat?.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl px-3 py-2 text-sm ${
                  m.senderRole === "ADMIN"
                    ? "bg-slate-100 text-slate-800"
                    : "ml-6 bg-blue-600 text-white"
                }`}
              >
                <p className="text-[11px] opacity-70">
                  {m.senderName} · {m.sentAt}
                </p>
                <p className="mt-0.5">{m.text}</p>
              </div>
            ))}
          </div>
          {selected && selected.status !== "PAID" ? (
            <div className="border-t border-slate-100 p-4">
              <Button
                className="w-full"
                onClick={() => approvePayment(selected.id).catch((e) => show(String(e)))}
              >
                Approve screenshot · mark Done
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
