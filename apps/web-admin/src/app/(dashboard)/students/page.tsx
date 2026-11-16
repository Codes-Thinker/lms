"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { readListCache, writeListCache } from "@/lib/list-cache";
import type { AdminPaymentInfo, FeeRecord } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSnackbar } from "@/components/ui/snackbar";
import { useNotifications } from "@/components/ui/notifications-provider";
import { UserAvatar } from "@/components/ui/user-avatar";

const CACHE_KEY = "lms_cache_students_v1";

type CourseEnr = {
  id: string;
  title: string;
  batch?: string | null;
  enrolledAt?: string;
  progressPercent?: number;
};

type StudentRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  track?: string | null;
  batch?: string | null;
  batchName?: string | null;
  status: string;
  progressPercent: number;
  courses: CourseEnr[];
};

type StudentsCache = {
  list: StudentRow[];
  fees: FeeRecord[];
  payment: AdminPaymentInfo;
};

function feeBadge(status: string) {
  if (status === "PAID") return <Badge variant="success">Paid / Done</Badge>;
  if (status === "SENT") return <Badge variant="warning">Screenshot sent</Badge>;
  if (status === "PARTIAL") return <Badge variant="warning">Partial</Badge>;
  return <Badge variant="danger">Due</Badge>;
}

function accountStatusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return <Badge variant="success">{status}</Badge>;
  if (s === "INVITED" || s === "PENDING") return <Badge variant="warning">{status}</Badge>;
  if (s === "SUSPENDED" || s === "INACTIVE") return <Badge variant="danger">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function mapStudent(u: Record<string, unknown>): StudentRow {
  const courses = ((u.courses as CourseEnr[] | undefined) ?? []).map((c) => ({
    id: String(c.id),
    title: String(c.title),
    batch: c.batch ?? null,
    enrolledAt: c.enrolledAt,
    progressPercent: c.progressPercent ?? 0,
  }));
  return {
    id: String(u.id),
    name: String(u.name || u.fullName || ""),
    email: String(u.email || ""),
    phone: (u.phone as string) || null,
    track: (u.track as string) || null,
    batch:
      typeof u.batch === "string"
        ? u.batch
        : ((u.batch as { code?: string } | null)?.code ?? null),
    batchName: (u.batchName as string) || null,
    status: String(u.status || "—"),
    progressPercent: Number(u.progressPercent ?? 0),
    courses,
  };
}

const defaultPayment: AdminPaymentInfo = {
  adminName: "",
  phone: "",
  jazzCash: "",
  easyPaisa: "",
  bankTitle: "",
  bankAccount: "",
};

export default function StudentsPage() {
  const [list, setList] = useState<StudentRow[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [payment, setPayment] = useState<AdminPaymentInfo>(defaultPayment);
  const [selectedId, setSelectedId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { show } = useSnackbar();
  const { push } = useNotifications();
  const selected = fees.find((f) => f.id === selectedId) ?? fees[0];

  const applyCache = useCallback((data: StudentsCache) => {
    setList(data.list);
    setFees(data.fees);
    setPayment(data.payment);
    setSelectedId((prev) => prev || data.fees[0]?.id || "");
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [users, feeList, pay] = await Promise.all([
        api<{ items: Array<Record<string, unknown>> }>(
          "/users?accountType=STUDENT&pageSize=100"
        ),
        api<FeeRecord[]>("/fees"),
        api<AdminPaymentInfo | null>("/system/payment-info"),
      ]);
      const students = users.items.map(mapStudent);
      const payInfo = pay ?? defaultPayment;
      setList(students);
      setFees(feeList);
      setPayment(payInfo);
      setSelectedId((prev) => prev || feeList[0]?.id || "");
      writeListCache<StudentsCache>(CACHE_KEY, {
        list: students,
        fees: feeList,
        payment: payInfo,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = readListCache<StudentsCache>(CACHE_KEY);
    if (cached) {
      applyCache(cached);
      setLoading(false);
    }
    refresh().catch((e) => show(e instanceof Error ? e.message : "Load failed"));
  }, [applyCache, refresh, show]);

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
      <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-semibold">Students</h2>
          <p className="text-sm text-slate-500">
            Live roster · fee chat · full profile at{" "}
            <span className="font-medium text-slate-700">/users/:id</span>{" "}
            (attendance, fees, tasks)
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={() => refresh().catch((e) => show(String(e)))}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error ? (
        <div className="glass-card border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

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
          <p className="text-xs text-slate-500">
            Click a row for course summary · progress from enrollments (no per-student report calls)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Student ID</th>
                <th className="px-5 py-3 font-medium">Course(s)</th>
                <th className="px-5 py-3 font-medium">Batch</th>
                <th className="px-5 py-3 font-medium">Enrolled</th>
                <th className="px-5 py-3 font-medium">Progress</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    No students yet
                  </td>
                </tr>
              ) : null}
              {list.map((s) => {
                const courseTitles =
                  s.courses.map((c) => c.title).join(", ") || "—";
                const batchLabel =
                  [s.batch, s.batchName].filter(Boolean).join(" · ") || "—";
                const enrolled = s.courses[0]?.enrolledAt ?? "—";
                const open = expandedId === s.id;
                return (
                  <Fragment key={s.id}>
                    <tr
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50/60"
                      onClick={() => setExpandedId(open ? null : s.id)}
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/users/${s.id}`}
                          className="flex items-center gap-2.5 hover:text-blue-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <UserAvatar
                            name={s.name}
                            email={s.email}
                            accountType="STUDENT"
                            size="sm"
                          />
                          <span className="font-semibold">{s.name}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-slate-600">{s.email}</p>
                        <p className="text-xs text-slate-500">{s.phone || "—"}</p>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                        {shortId(s.id)}
                      </td>
                      <td className="max-w-[200px] truncate px-5 py-3.5" title={courseTitles}>
                        {courseTitles}
                      </td>
                      <td className="px-5 py-3.5">
                        <p>{batchLabel}</p>
                        {s.track ? (
                          <p className="text-xs text-slate-500">{s.track}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">{enrolled}</td>
                      <td className="px-5 py-3.5 font-medium">{s.progressPercent}%</td>
                      <td className="px-5 py-3.5">{accountStatusBadge(s.status)}</td>
                    </tr>
                    {open ? (
                      <tr className="border-t border-slate-100 bg-blue-50/30">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-2 text-sm">
                              <p className="font-medium text-slate-700">Enrolled courses</p>
                              {s.courses.length === 0 ? (
                                <p className="text-slate-500">No enrollments</p>
                              ) : (
                                <ul className="space-y-1">
                                  {s.courses.map((c) => (
                                    <li key={c.id} className="text-slate-600">
                                      {c.title}
                                      {c.batch ? ` · ${c.batch}` : ""} — {c.progressPercent ?? 0}%
                                      {c.enrolledAt ? ` · from ${c.enrolledAt}` : ""}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <Button size="sm" variant="secondary" asChild>
                              <Link href={`/users/${s.id}`}>Full profile</Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
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