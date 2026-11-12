"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSnackbar } from "@/components/ui/snackbar";
import { useNotifications } from "@/components/ui/notifications-provider";

const TYPE_LABEL: Record<string, string> = {
  attendance: "Attendance",
  fee: "Fees",
  task: "Task",
  project: "Project",
  system: "System",
  chat: "Chat",
  report: "Report",
  complain: "Complain",
  survey: "Survey",
  general: "Support",
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { notes, unread, markAllRead } = useNotifications();
  const { show } = useSnackbar();

  function onMarkAll() {
    markAllRead();
    show("Notifications marked as read");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full border border-slate-200 bg-white p-2.5 transition hover:bg-slate-50"
      >
        <Bell className="h-4 w-4 text-slate-700" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <button type="button" onClick={onMarkAll} className="text-xs font-medium text-blue-600">
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notes.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications</p>
            ) : (
              notes.map((n) => (
                <div
                  key={n.id}
                  className={cn("border-b border-slate-50 px-4 py-3", !n.read && "bg-slate-50")}
                >
                  {/* Title + type only — never show who received what */}
                  <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {TYPE_LABEL[n.type] ?? n.type} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
