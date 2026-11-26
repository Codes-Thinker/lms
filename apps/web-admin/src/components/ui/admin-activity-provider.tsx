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

type ActivitySummary = {
  openTickets: number;
  reports: number;
  complains: number;
  surveys: number;
  feesAwaitingReview: number;
  leavePending: number;
  chatUnread: number;
  chatUnreadThreads: number;
};

type AdminActivityContextValue = {
  openTickets: number;
  feesAwaitingReview: number;
  leavePending: number;
  chatUnread: number;
  chatUnreadThreads: number;
  reports: number;
  complains: number;
  refresh: () => Promise<void>;
};

const empty: ActivitySummary = {
  openTickets: 0,
  reports: 0,
  complains: 0,
  surveys: 0,
  feesAwaitingReview: 0,
  leavePending: 0,
  chatUnread: 0,
  chatUnreadThreads: 0,
};

const AdminActivityContext = createContext<AdminActivityContextValue>({
  openTickets: 0,
  feesAwaitingReview: 0,
  leavePending: 0,
  chatUnread: 0,
  chatUnreadThreads: 0,
  reports: 0,
  complains: 0,
  refresh: async () => {},
});

export function AdminActivityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [summary, setSummary] = useState<ActivitySummary>(empty);
  const prevChat = useRef(0);
  const primed = useRef(false);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const data = await api<ActivitySummary>("/support/activity-summary");
      setSummary({
        openTickets: data.openTickets ?? 0,
        reports: data.reports ?? 0,
        complains: data.complains ?? 0,
        surveys: data.surveys ?? 0,
        feesAwaitingReview: data.feesAwaitingReview ?? 0,
        leavePending: data.leavePending ?? 0,
        chatUnread: data.chatUnread ?? 0,
        chatUnreadThreads: data.chatUnreadThreads ?? 0,
      });
      // Chat beep here; fees/tickets/surveys beep via NotificationsProvider.
      if (primed.current && (data.chatUnread ?? 0) > prevChat.current) {
        playNotifyTone(880);
      }
      prevChat.current = data.chatUnread ?? 0;
      primed.current = true;
    } catch {
      // session loading
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const value = useMemo(
    () => ({
      openTickets: summary.openTickets,
      feesAwaitingReview: summary.feesAwaitingReview,
      leavePending: summary.leavePending,
      chatUnread: summary.chatUnread,
      chatUnreadThreads: summary.chatUnreadThreads,
      reports: summary.reports,
      complains: summary.complains,
      refresh,
    }),
    [summary, refresh]
  );

  return (
    <AdminActivityContext.Provider value={value}>
      {children}
    </AdminActivityContext.Provider>
  );
}

export function useAdminActivity() {
  return useContext(AdminActivityContext);
}
