"use client";

import { useAdminActivity } from "@/components/ui/admin-activity-provider";

/** @deprecated Prefer AdminActivityProvider */
export { AdminActivityProvider as ChatInboxProvider } from "@/components/ui/admin-activity-provider";

export function useChatInbox() {
  const a = useAdminActivity();
  return {
    unreadMessages: a.chatUnread,
    unreadThreads: a.chatUnreadThreads,
    refresh: a.refresh,
  };
}
