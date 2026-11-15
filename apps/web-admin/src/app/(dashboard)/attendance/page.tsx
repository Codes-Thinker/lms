"use client";

import { useCallback, useEffect, useState } from "react";
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
  autoCheckout?: boolean;
  source?: string;
};

export default function AttendancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<Row[]>("/attendance");
      setRows(data);
      setError(null);
      setLive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="glass-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-lg font-semibold">Attendance</h2>
          <p className="text-sm text-slate-500">
            Geofence check-in (50m) · live every 5s · auto checkout at shift end
          </p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
        <Badge variant={live ? "success" : "secondary"}>
          {live ? "Live" : "Connecting"}
        </Badge>
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
                  <Badge variant="secondary">
                    {r.status}
                    {r.autoCheckout ? " · auto" : ""}
                  </Badge>
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-500">
                  {r.checkInAt
                    ? new Date(r.checkInAt).toLocaleTimeString()
                    : "—"}
                  {" / "}
                  {r.checkOutAt
                    ? new Date(r.checkOutAt).toLocaleTimeString()
                    : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-slate-500"
                >
                  No attendance yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
