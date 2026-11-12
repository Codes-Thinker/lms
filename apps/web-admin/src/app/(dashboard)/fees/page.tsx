"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useSnackbar } from "@/components/ui/snackbar";

type FeeRow = {
  id: string;
  studentId: string;
  studentName: string;
  courseTitle: string;
  month: string;
  amount: number;
  status: string;
  dueDate: string;
};

function feeBadge(status: string) {
  if (status === "PAID") return <Badge variant="success">Paid</Badge>;
  if (status === "SENT") return <Badge variant="warning">Screenshot sent</Badge>;
  if (status === "PARTIAL") return <Badge variant="warning">Partial</Badge>;
  return <Badge variant="danger">Due</Badge>;
}

export default function FeesPage() {
  const [rows, setRows] = useState<FeeRow[]>([]);
  const { show } = useSnackbar();

  async function load() {
    setRows(await api<FeeRow[]>("/fees"));
  }

  useEffect(() => {
    load().catch((e) => show(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Student fees</h2>
        <p className="text-sm text-slate-500">
          Fees are for students only — open a student profile for full history
        </p>
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Course</th>
              <th className="px-5 py-3 font-medium">Month</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
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
                <td className="px-5 py-3.5">{r.courseTitle}</td>
                <td className="px-5 py-3.5">{r.month}</td>
                <td className="px-5 py-3.5">Rs {r.amount.toLocaleString()}</td>
                <td className="px-5 py-3.5">{feeBadge(r.status)}</td>
                <td className="px-5 py-3.5">
                  {r.status !== "PAID" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        api(`/fees/${r.id}/status`, {
                          method: "PATCH",
                          body: JSON.stringify({ status: "PAID" }),
                        })
                          .then(load)
                          .catch((e) => show(String(e)))
                      }
                    >
                      Mark paid
                    </Button>
                  ) : (
                    <Link
                      href={`/users/${r.studentId}`}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Profile
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                  No student fee cases yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
