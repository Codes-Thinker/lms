"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useChatInbox } from "@/components/ui/chat-inbox-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  senderName: string;
  senderRole: string;
  text: string;
  sentAt: string;
};

type Thread = {
  id: string;
  userName: string;
  userRole: string;
  lastMessage?: string | null;
  unreadByAdmin: number;
  updatedAt: string;
  messages?: Message[];
};

export default function InboxPage() {
  const { refresh } = useChatInbox();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [active, setActive] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const rows = await api<Thread[]>("/support/chats");
      setThreads(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chats");
    }
  }, []);

  const openThread = useCallback(
    async (id: string) => {
      setSelectedId(id);
      try {
        await api(`/support/chats/${id}/read`, { method: "POST" });
        const full = await api<Thread>(`/support/chats/${id}`);
        setActive(full);
        await loadList();
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to open chat");
      }
    },
    [loadList, refresh]
  );

  useEffect(() => {
    void loadList();
    const id = window.setInterval(() => void loadList(), 8000);
    return () => window.clearInterval(id);
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const full = await api<Thread>(`/support/chats/${selectedId}`);
          setActive(full);
        } catch {
          /* ignore */
        }
      })();
    }, 4000);
    return () => window.clearInterval(id);
  }, [selectedId]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !text.trim() || sending) return;
    setSending(true);
    try {
      const full = await api<Thread>(`/support/chats/${selectedId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: text.trim() }),
      });
      setActive(full);
      setText("");
      await loadList();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="glass-card p-4">
          <h2 className="text-lg font-semibold">Chat inbox</h2>
          <p className="text-sm text-slate-500">
            Students · interns · staff · teachers
          </p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="space-y-2">
          {threads.map((t) => {
            const activeRow = selectedId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => void openThread(t.id)}
                className={cn(
                  "glass-card flex w-full items-center justify-between gap-3 p-4 text-left transition",
                  activeRow ? "ring-2 ring-blue-500" : "hover:bg-slate-50"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {t.userName} · {t.userRole}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {t.lastMessage || "No messages yet"}
                  </p>
                </div>
                {t.unreadByAdmin > 0 ? (
                  <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                    {t.unreadByAdmin}
                  </span>
                ) : null}
              </button>
            );
          })}
          {threads.length === 0 && !error ? (
            <p className="text-sm text-slate-500">No chats yet</p>
          ) : null}
        </div>
      </div>

      <div className="glass-card flex min-h-[480px] flex-col">
        {!active ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="font-semibold">
                {active.userName} · {active.userRole}
              </p>
              <p className="text-xs text-slate-500">Admin reply sends a push to their app</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {(active.messages || []).map((m) => {
                const mine = m.senderRole === "ADMIN";
                return (
                  <div
                    key={m.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                        mine
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 bg-white text-slate-800"
                      )}
                    >
                      <p
                        className={cn(
                          "mb-1 text-[11px]",
                          mine ? "text-blue-100" : "text-slate-400"
                        )}
                      >
                        {m.senderName}
                      </p>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={onSend}
              className="flex gap-2 border-t border-slate-200 p-3"
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Reply as admin…"
                className="h-10"
              />
              <Button type="submit" disabled={sending || !text.trim()}>
                {sending ? "…" : "Send"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
