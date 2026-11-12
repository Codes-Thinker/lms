"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/components/ui/snackbar";

type FeeRow = {
  id: string;
  studentName: string;
  courseTitle: string;
  month: string;
  amount: number;
  status: string;
  dueDate: string;
};

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
        <h2 className="text-lg font-semibold">Fees</h2>
        <p className="text-sm text-slate-500">All fee cases</p>
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
                <td className="px-5 py-3.5 font-semibold">{r.studentName}</td>
                <td className="px-5 py-3.5">{r.courseTitle}</td>
                <td className="px-5 py-3.5">{r.month}</td>
                <td className="px-5 py-3.5">Rs {r.amount.toLocaleString()}</td>
                <td className="px-5 py-3.5">
                  <Badge variant="secondary">{r.status}</Badge>
                </td>
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
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
