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

type Summary = {
  unreadMessages: number;
  unreadThreads: number;
  totalThreads: number;
};

type ChatInboxContextValue = {
  unreadMessages: number;
  unreadThreads: number;
  refresh: () => Promise<void>;
};

const ChatInboxContext = createContext<ChatInboxContextValue>({
  unreadMessages: 0,
  unreadThreads: 0,
  refresh: async () => {},
});

export function ChatInboxProvider({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = useState<Summary>({
    unreadMessages: 0,
    unreadThreads: 0,
    totalThreads: 0,
  });
  const prevUnread = useRef(0);
  const primed = useRef(false);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const data = await api<Summary>("/support/chats/unread-summary");
      setSummary(data);
      if (primed.current && data.unreadMessages > prevUnread.current) {
        playNotifyTone(880);
      }
      prevUnread.current = data.unreadMessages;
      primed.current = true;
    } catch {
      // silent — session may be loading
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const value = useMemo(
    () => ({
      unreadMessages: summary.unreadMessages,
      unreadThreads: summary.unreadThreads,
      refresh,
    }),
    [summary.unreadMessages, summary.unreadThreads, refresh]
  );

  return (
    <ChatInboxContext.Provider value={value}>{children}</ChatInboxContext.Provider>
  );
}

export function useChatInbox() {
  return useContext(ChatInboxContext);
}
