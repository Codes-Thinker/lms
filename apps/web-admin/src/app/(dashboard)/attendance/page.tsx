"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

type Row = {
  id: string;
  personName: string;
  role: string;
  date: string;
  status: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  courseTitle?: string | null;
  source?: string;
};

export default function AttendancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Row[]>("/attendance")
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Attendance</h2>
        <p className="text-sm text-slate-500">Live check-in / check-out from the Android app</p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>
      <div className="glass-card table-scroll overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Person</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Course</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">In / Out</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-5 py-3.5">
                  <p className="font-semibold">{r.personName}</p>
                  <p className="text-xs text-slate-500">{r.role}</p>
                </td>
                <td className="px-5 py-3.5">{r.date}</td>
                <td className="px-5 py-3.5">{r.courseTitle || "—"}</td>
                <td className="px-5 py-3.5">
                  <Badge variant="secondary">{r.status}</Badge>
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-500">
                  {r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : "—"}
                  {" / "}
                  {r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
