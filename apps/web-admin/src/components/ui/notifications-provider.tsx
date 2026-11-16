"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, getToken } from "@/lib/api";
import { playNotifyTone } from "@/lib/notify-tone";
import type { AppNotification } from "@/types";

type ApiNote = {
  id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
  read: boolean;
  data?: Record<string, string> | null;
};

type NotifyInput = {
  title: string;
  body?: string;
  type?: AppNotification["type"];
};

type NotificationsContextValue = {
  notes: AppNotification[];
  unread: number;
  push: (input: NotifyInput) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

function mapType(raw: string, data?: Record<string, string> | null): AppNotification["type"] {
  const t = (raw || "").toUpperCase();
  const kind = (data?.kind || "").toUpperCase();
  if (t === "CHAT" || kind === "CHAT") return "chat";
  if (t === "FEE" || kind === "FEE") return "fee";
  if (t === "ATTENDANCE") return "attendance";
  if (t === "TASK") return "task";
  if (kind === "REPORT") return "report";
  if (kind === "COMPLAIN") return "complain";
  if (kind === "SURVEY") return "survey";
  if (t === "SYSTEM") return "system";
  return "general";
}

function mapNote(n: ApiNote): AppNotification {
  const data =
    n.data && typeof n.data === "object"
      ? Object.fromEntries(
          Object.entries(n.data).map(([k, v]) => [k, String(v ?? "")])
        )
      : null;
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    type: mapType(n.type, data),
    createdAt: n.createdAt,
    read: n.read,
    data,
  };
}

/** Sidebar section (or deep link) for a notification tap. */
export function hrefForNotification(n: AppNotification): string {
  const d = n.data ?? {};
  switch (n.type) {
    case "attendance":
      return "/attendance";
    case "fee":
      return "/fees";
    case "chat":
      return "/inbox";
    case "report":
    case "complain":
    case "survey":
    case "general":
      return "/feedback";
    case "task":
      return "/tasks";
    case "project":
      return "/interns";
    case "system":
      if (d.kind === "ACCOUNT_DELETED") return "/users";
      return "/";
    default:
      return "/";
  }
}

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notes, setNotes] = useState<AppNotification[]>([]);
  const prevUnread = useRef(0);
  const primed = useRef(false);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const rows = await api<ApiNote[]>("/notifications/me");
      const mapped = rows.map(mapNote);
      // Chat tone is handled by ChatInboxProvider — beep here for fees/tickets/surveys.
      const alertUnread = mapped.filter(
        (n) => !n.read && n.type !== "chat"
      ).length;
      if (primed.current && alertUnread > prevUnread.current) {
        playNotifyTone(740);
      }
      prevUnread.current = alertUnread;
      primed.current = true;
      setNotes(mapped);
    } catch {
      // session loading
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const push = useCallback((input: NotifyInput) => {
    const note: AppNotification = {
      id: `local-${Date.now()}`,
      title: input.title,
      body: input.body ?? "",
      type: input.type ?? "system",
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotes((prev) => [note, ...prev]);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (!id.startsWith("local-")) {
      void api(`/notifications/${id}/read`, { method: "POST" }).catch(() => {});
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
    prevUnread.current = 0;
    void api("/notifications/read-all", { method: "POST" }).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      notes,
      unread: notes.filter((n) => !n.read).length,
      push,
      markRead,
      markAllRead,
      refresh,
    }),
    [notes, push, markRead, markAllRead, refresh]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
