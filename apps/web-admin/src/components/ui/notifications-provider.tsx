"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { appNotifications as initial } from "@/lib/mock-data";
import type { AppNotification } from "@/types";

type NotifyInput = {
  title: string;
  body?: string;
  type?: AppNotification["type"];
};

type NotificationsContextValue = {
  notes: AppNotification[];
  unread: number;
  push: (input: NotifyInput) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const GENERIC_BODY: Record<AppNotification["type"], string> = {
  attendance: "An attendance event was recorded",
  fee: "A fee update was recorded",
  task: "A task update was recorded",
  project: "A project update was recorded",
  system: "A system update was recorded",
};

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<AppNotification[]>(initial);

  const push = useCallback((input: NotifyInput) => {
    const type = input.type ?? "system";
    // Never store person-targeting detail in the admin notification list.
    const note: AppNotification = {
      id: `n-${Date.now()}`,
      title: input.title,
      body: GENERIC_BODY[type],
      type,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotes((prev) => [note, ...prev]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const value = useMemo(
    () => ({
      notes,
      unread: notes.filter((n) => !n.read).length,
      push,
      markAllRead,
    }),
    [notes, push, markAllRead]
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
