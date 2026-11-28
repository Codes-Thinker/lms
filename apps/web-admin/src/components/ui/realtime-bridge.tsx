"use client";

import { useEffect } from "react";
import { connectAdminRealtime } from "@/lib/realtime";
import { useNotifications } from "@/components/ui/notifications-provider";
import { useSnackbar } from "@/components/ui/snackbar";
import { useChatInbox } from "@/components/ui/chat-inbox-provider";
import { useAdminActivity } from "@/components/ui/admin-activity-provider";
import { playNotifyTone } from "@/lib/notify-tone";

function mapRealtimeType(
  typeRaw: string
):
  | "chat"
  | "fee"
  | "task"
  | "attendance"
  | "leave"
  | "general" {
  const t = typeRaw.toLowerCase();
  if (t === "chat") return "chat";
  if (t === "fee") return "fee";
  if (t === "task") return "task";
  if (t === "attendance") return "attendance";
  if (t === "leave") return "leave";
  return "general";
}

/** Listens for Socket.IO notification events and refreshes bell + inbox. */
export function RealtimeBridge() {
  const { refresh, push } = useNotifications();
  const { refresh: refreshChat } = useChatInbox();
  const { refresh: refreshActivity } = useAdminActivity();
  const { show } = useSnackbar();

  useEffect(() => {
    return connectAdminRealtime({
      onNotification: (payload) => {
        const title = String(payload.title || "Notification");
        const body = String(payload.body || "");
        const typeRaw = String(payload.type || "GENERAL").toLowerCase();
        const mapped = mapRealtimeType(typeRaw);
        const data =
          payload.data && typeof payload.data === "object"
            ? Object.fromEntries(
                Object.entries(payload.data as Record<string, unknown>).map(
                  ([k, v]) => [k, String(v ?? "")]
                )
              )
            : undefined;
        push({
          title,
          body,
          type: mapped,
          data,
        });
        show(body ? `${title}: ${body}` : title, "info");
        if (mapped === "leave") {
          playNotifyTone(720);
          void refreshActivity();
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("lms:leave-updated", { detail: payload })
            );
          }
        }
        void refresh();
        void refreshChat();
      },
      onLeaveUpdated: () => {
        void refreshActivity();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("lms:leave-updated"));
        }
      },
      onProfileUpdated: (payload) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("lms:profile-updated", { detail: payload })
          );
        }
      },
    });
  }, [push, refresh, refreshChat, refreshActivity, show]);

  return null;
}
