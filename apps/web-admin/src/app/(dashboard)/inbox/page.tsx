"use client";

import { useState } from "react";
import { adminChats as initial, adminUser } from "@/lib/mock-data";
import type { AdminChatThread } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSnackbar } from "@/components/ui/snackbar";
import { useNotifications } from "@/components/ui/notifications-provider";

export default function InboxPage() {
  const [threads, setThreads] = useState<AdminChatThread[]>(initial);
  const [activeId, setActiveId] = useState(initial[0]?.id ?? "");
  const [text, setText] = useState("");
  const active = threads.find((t) => t.id === activeId) ?? threads[0];
  const { show } = useSnackbar();
  const { push } = useNotifications();

  function openThread(id: string) {
    setActiveId(id);
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unreadByAdmin: 0 } : t))
    );
  }

  function send() {
    if (!active || !text.trim()) return;
    const msg = {
      id: `m-${Date.now()}`,
      senderId: adminUser.id,
      senderName: adminUser.name,
      senderRole: "ADMIN" as const,
      text: text.trim(),
      sentAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setThreads((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? {
              ...t,
              lastMessage: msg.text,
              updatedAt: new Date().toISOString(),
              messages: [...t.messages, msg],
            }
          : t
      )
    );
    setText("");
    show(`Reply sent to ${active.userName}`);
    push({
      title: "Chat reply sent",
      body: `${active.userName}: ${msg.text}`,
      type: "system",
    });
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Admin chat</h2>
        <p className="text-sm text-slate-500">
          Users who messaged you appear here · reply clear & simple
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 font-semibold">Conversations</div>
          <div className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openThread(t.id)}
                className={`w-full px-4 py-3 text-left transition ${
                  active?.id === t.id ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{t.userName}</p>
                  {t.unreadByAdmin > 0 ? (
                    <Badge variant="danger">{t.unreadByAdmin}</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">{t.userRole}</p>
                <p className="mt-1 truncate text-sm text-slate-600">{t.lastMessage}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card flex min-h-[520px] flex-col overflow-hidden">
          {active ? (
            <>
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="font-semibold">{active.userName}</p>
                <p className="text-sm text-slate-500">{active.userRole} · chat with admin only</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.senderRole === "ADMIN"
                        ? "ml-auto bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p className="text-[11px] opacity-70">
                      {m.senderName} · {m.sentAt}
                    </p>
                    <p className="mt-0.5">{m.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-slate-100 p-4">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type reply…"
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <Button onClick={send}>Send</Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              No chats yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
