"use client";

import { useEffect } from "react";
import { connectAdminRealtime } from "@/lib/realtime";
import { useNotifications } from "@/components/ui/notifications-provider";
import { useSnackbar } from "@/components/ui/snackbar";
import { useChatInbox } from "@/components/ui/chat-inbox-provider";

/** Listens for Socket.IO notification events and refreshes bell + inbox. */
export function RealtimeBridge() {
  const { refresh, push } = useNotifications();
  const { refresh: refreshChat } = useChatInbox();
  const { show } = useSnackbar();

  useEffect(() => {
    return connectAdminRealtime({
      onNotification: (payload) => {
        const title = String(payload.title || "Notification");
        const body = String(payload.body || "");
        const typeRaw = String(payload.type || "GENERAL").toLowerCase();
        push({
          title,
          body,
          type:
            typeRaw === "chat"
              ? "chat"
              : typeRaw === "fee"
                ? "fee"
                : typeRaw === "task"
                  ? "task"
                  : typeRaw === "attendance"
                    ? "attendance"
                    : "general",
        });
        show(body ? `${title}: ${body}` : title, "info");
        void refresh();
        void refreshChat();
      },
    });
  }, [push, refresh, refreshChat, show]);

  return null;
}
