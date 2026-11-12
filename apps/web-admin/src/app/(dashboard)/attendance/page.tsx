"use client";

import { useState } from "react";
import { attendanceRecords as initial } from "@/lib/mock-data";
import type { AttendanceRecord, AttendanceStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSnackbar } from "@/components/ui/snackbar";
import { useNotifications } from "@/components/ui/notifications-provider";

function statusBadge(status: AttendanceRecord["status"]) {
  if (status === "PRESENT") return <Badge variant="success">Present · In</Badge>;
  if (status === "LATE") return <Badge variant="warning">Late · In</Badge>;
  if (status === "CHECKED_OUT") return <Badge variant="default">Checked out</Badge>;
  return <Badge variant="danger">Absent</Badge>;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AttendancePage() {
  const [rows, setRows] = useState<AttendanceRecord[]>(initial);
  const { show } = useSnackbar();
  const { push } = useNotifications();

  function setStatus(id: string, status: AttendanceStatus) {
    const row = rows.find((r) => r.id === id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (row) {
      push({
        title: "Attendance corrected",
        body: `${row.personName} → ${status}`,
        type: "attendance",
      });
    }
    show(`Attendance updated to ${status}`);
  }

  const inOffice = rows.filter((r) => !r.checkOutAt && r.status !== "ABSENT").length;
  const late = rows.filter((r) => r.status === "LATE").length;
  const out = rows.filter((r) => !!r.checkOutAt || r.status === "CHECKED_OUT").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card p-4">
          <p className="text-sm text-slate-500">In office now</p>
          <p className="text-2xl font-semibold text-emerald-600">{inOffice}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-500">Late check-ins</p>
          <p className="text-2xl font-semibold text-amber-600">{late}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-500">Checked out</p>
          <p className="text-2xl font-semibold text-blue-600">{out}</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold">Who came · when left</h2>
          <p className="text-sm text-slate-500">
            Student / Intern / Staff check-in & check-out from app (device time)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Person</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Check in</th>
                <th className="px-5 py-3 font-medium">Check out</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Update</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-5 py-3">{row.date}</td>
                  <td className="px-5 py-3 font-medium">{row.personName}</td>
                  <td className="px-5 py-3">
                    <Badge variant="secondary">{row.role}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {fmt(row.checkInAt)}
                    <span className="ml-1 text-[11px] text-slate-400">({row.source})</span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {row.checkOutAt ? fmt(row.checkOutAt) : (
                      <span className="text-emerald-600 font-medium">Still in</span>
                    )}
                  </td>
                  <td className="px-5 py-3">{statusBadge(row.status)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={row.status === "CHECKED_OUT" ? "PRESENT" : row.status}
                        onValueChange={(v) => setStatus(row.id, v as AttendanceStatus)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRESENT">PRESENT</SelectItem>
                          <SelectItem value="LATE">LATE</SelectItem>
                          <SelectItem value="ABSENT">ABSENT</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="secondary" onClick={() => show("Attendance saved")}>
                        Save
                      </Button>
                    </div>
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
