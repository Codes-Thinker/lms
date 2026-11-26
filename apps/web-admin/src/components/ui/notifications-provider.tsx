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
  /** Mark unread notes for a sidebar section when admin opens/works that page. */
  markSectionRead: (href: string) => void;
  unreadForSection: (href: string) => number;
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
  if (t === "LEAVE") return "leave";
  if (t === "CERTIFICATE" || t === "QUIZ") return "general";
  if (kind === "REPORT" || t === "REPORT") return "report";
  if (kind === "COMPLAIN" || t === "COMPLAIN") return "complain";
  if (kind === "SURVEY" || t === "SURVEY") return "survey";
  if (t === "SYSTEM") return "system";
  return "general";
}

const SECTION_TYPES: Record<string, AppNotification["type"][]> = {
  "/feedback": ["report", "complain", "survey", "general"],
  "/fees": ["fee"],
  "/leave": ["leave"],
  "/inbox": ["chat"],
  "/attendance": ["attendance"],
  "/staff": ["task"],
  "/interns": ["project"],
};

export function typesForSection(href: string): AppNotification["type"][] {
  if (SECTION_TYPES[href]) return SECTION_TYPES[href];
  // Nested routes: /fees/x → /fees
  const base = Object.keys(SECTION_TYPES).find(
    (k) => href === k || href.startsWith(`${k}/`)
  );
  return base ? SECTION_TYPES[base] : [];
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
    case "leave":
      return "/leave";
    case "chat":
      return "/inbox";
    case "report":
    case "complain":
    case "survey":
    case "general":
      return "/feedback";
    case "task": {
      const taskId = d.taskId || "";
      if (taskId) return `/staff?taskChat=${encodeURIComponent(taskId)}`;
      return "/staff";
    }
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
      // Beep for any new unread (chat, fees, tasks, …).
      const alertUnread = mapped.filter((n) => !n.read).length;
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
    // Fallback poll when Socket.IO is unavailable.
    const id = window.setInterval(() => void refresh(), 12000);
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

  const unreadForSection = useCallback(
    (href: string) => {
      const types = typesForSection(href);
      if (!types.length) return 0;
      return notes.filter((n) => !n.read && types.includes(n.type)).length;
    },
    [notes]
  );

  const markSectionRead = useCallback(
    (href: string) => {
      const types = typesForSection(href);
      if (!types.length) return;
      const unread = notes.filter((n) => !n.read && types.includes(n.type));
      if (!unread.length) return;
      setNotes((prev) =>
        prev.map((n) =>
          types.includes(n.type) ? { ...n, read: true } : n
        )
      );
      prevUnread.current = Math.max(0, prevUnread.current - unread.length);
      for (const n of unread) {
        if (!n.id.startsWith("local-")) {
          void api(`/notifications/${n.id}/read`, { method: "POST" }).catch(
            () => {}
          );
        }
      }
    },
    [notes]
  );

  const value = useMemo(
    () => ({
      notes,
      unread: notes.filter((n) => !n.read).length,
      push,
      markRead,
      markAllRead,
      markSectionRead,
      unreadForSection,
      refresh,
    }),
    [
      notes,
      push,
      markRead,
      markAllRead,
      markSectionRead,
      unreadForSection,
      refresh,
    ]
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
