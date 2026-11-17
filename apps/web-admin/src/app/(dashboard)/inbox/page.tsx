"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useChatInbox } from "@/components/ui/chat-inbox-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImageFile } from "@/lib/compress-image";
import { cn } from "@/lib/utils";
import { SearchParamsBoundary } from "@/components/ui/search-params-boundary";

type Message = {
  id: string;
  senderName: string;
  senderRole: string;
  text: string;
  imageData?: string | null;
  imageName?: string | null;
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

const EMOJIS = [
  "😀", "😁", "😂", "😊", "😍", "🤝", "👍", "👏",
  "🔥", "🎉", "✅", "📌", "📷", "🙏", "💯", "😎",
];


function messagesFingerprint(msgs?: Message[]) {
  return (msgs || [])
    .map(
      (m) =>
        `${m.id}:${m.imageData ? "1" : "0"}:${(m.text || "").length}`
    )
    .join("|");
}

function isPhotoOnlyText(text?: string | null) {
  const t = (text || "").trim();
  return !t || t === "📷 Photo" || t === "Photo";
}

function formatTime(raw?: string) {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 16);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function InboxPageInner() {
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get("userId")?.trim() || "";
  const { refresh } = useChatInbox();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [active, setActive] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const openedUserRef = useRef<string | null>(null);

  const scrollMessagesToEnd = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

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
      setShowEmoji(false);
      try {
        await api(`/support/chats/${id}/read`, { method: "POST" });
        const full = await api<Thread>(`/support/chats/${id}`);
        setActive(full);
        await loadList();
        await refresh();
        requestAnimationFrame(() => scrollMessagesToEnd());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to open chat");
      }
    },
    [loadList, refresh, scrollMessagesToEnd]
  );

  useEffect(() => {
    void loadList();
    const id = window.setInterval(() => void loadList(), 8000);
    return () => window.clearInterval(id);
  }, [loadList]);

  // Deep-link from Students / Users / Interns: open or create chat with user.
  useEffect(() => {
    if (!userIdParam) return;
    if (openedUserRef.current === userIdParam) return;
    openedUserRef.current = userIdParam;
    void (async () => {
      try {
        const thread = await api<Thread & { id: string }>("/support/chats/open", {
          method: "POST",
          body: JSON.stringify({ userId: userIdParam }),
        });
        await loadList();
        await openThread(thread.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not open chat");
      }
    })();
  }, [userIdParam, loadList, openThread]);

  useEffect(() => {
    if (!selectedId) return;
    const id = window.setInterval(() => {
      if (sendingRef.current) return;
      void (async () => {
        try {
          const full = await api<Thread>(`/support/chats/${selectedId}`);
          setActive((prev) => {
            if (
              prev &&
              messagesFingerprint(prev.messages) ===
                messagesFingerprint(full.messages)
            ) {
              return prev;
            }
            return full;
          });
        } catch {
          /* ignore */
        }
      })();
    }, 4000);
    return () => window.clearInterval(id);
  }, [selectedId]);

  useEffect(() => {
    scrollMessagesToEnd();
  }, [active?.messages?.length, scrollMessagesToEnd]);

  useEffect(() => {
    if (!previewSrc) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewSrc(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewSrc]);

  async function sendPayload(payload: {
    text?: string;
    imageData?: string;
    imageName?: string;
  }) {
    if (!selectedId || sending) return;
    setSending(true);
    sendingRef.current = true;
    setShowEmoji(false);

    const optimisticId = `local-${Date.now()}`;
    const optimistic: Message = {
      id: optimisticId,
      senderName: "Admin",
      senderRole: "ADMIN",
      text: payload.text || (payload.imageData ? "📷 Photo" : ""),
      imageData: payload.imageData,
      imageName: payload.imageName,
      sentAt: new Date().toISOString(),
    };
    setActive((prev) =>
      prev
        ? { ...prev, messages: [...(prev.messages || []), optimistic] }
        : prev
    );

    try {
      const full = await api<Thread>(`/support/chats/${selectedId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setActive(full);
      setText("");
      await loadList();
      await refresh();
    } catch (err) {
      setActive((prev) =>
        prev
          ? {
              ...prev,
              messages: (prev.messages || []).filter(
                (m) => m.id !== optimisticId
              ),
            }
          : prev
      );
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await sendPayload({ text: text.trim() });
  }

  async function onPickImage(file: File | null) {
    if (!file || !selectedId) return;
    if (!file.type.startsWith("image/")) {
      setError("Only images are supported");
      return;
    }
    try {
      const { dataUrl, name } = await compressImageFile(file);
      await sendPayload({
        text: text.trim() || undefined,
        imageData: dataUrl,
        imageName: name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    }
  }

  return (
    <>
      {/* Fixed WhatsApp-style pane — only thread list + messages scroll */}
      <div
        className="grid min-h-0 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]"
        style={{ height: "calc(100vh - 7.5rem)" }}
      >
        <div className="glass-card flex min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-semibold">Chat inbox</h2>
            <p className="text-xs text-slate-500">
              Tap a chat. Photos open full size.
            </p>
            {error ? (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {threads.map((t) => {
              const activeRow = selectedId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => void openThread(t.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition",
                    activeRow
                      ? "bg-blue-600 text-white"
                      : "hover:bg-slate-50"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {t.userName}
                      <span
                        className={cn(
                          "ml-1 font-normal",
                          activeRow ? "text-blue-100" : "text-slate-400"
                        )}
                      >
                        , {t.userRole}
                      </span>
                    </p>
                    <p
                      className={cn(
                        "truncate text-xs",
                        activeRow ? "text-blue-100" : "text-slate-500"
                      )}
                    >
                      {t.lastMessage || "No messages yet"}
                    </p>
                  </div>
                  {t.unreadByAdmin > 0 ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                        activeRow
                          ? "bg-white text-blue-700"
                          : "bg-blue-600 text-white"
                      )}
                    >
                      {t.unreadByAdmin}
                    </span>
                  ) : null}
                </button>
              );
            })}
            {threads.length === 0 && !error ? (
              <p className="px-3 py-8 text-center text-sm text-slate-500">
                No chats yet
              </p>
            ) : null}
          </div>
        </div>

        <div className="glass-card flex min-h-0 flex-col overflow-hidden">
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-slate-200 px-4 py-3">
                <p className="font-semibold">
                  {active.userName}, {active.userRole}
                </p>
                <p className="text-xs text-slate-500">
                  Fee screenshots and photos. Click image to enlarge.
                </p>
              </div>

              <div
                ref={messagesRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50/60 px-4 py-4"
              >
                {(active.messages || []).map((m) => {
                  const mine = m.senderRole === "ADMIN";
                  const showText = !isPhotoOnlyText(m.text) || !m.imageData;
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        mine ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[min(85%,28rem)] rounded-2xl px-3 py-2 text-sm shadow-sm",
                          mine
                            ? "rounded-br-md bg-blue-600 text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                        )}
                      >
                        <p
                          className={cn(
                            "mb-1 flex items-center justify-between gap-3 text-[11px]",
                            mine ? "text-blue-100" : "text-slate-400"
                          )}
                        >
                          <span>{m.senderName}</span>
                          <span>{formatTime(m.sentAt)}</span>
                        </p>
                        {m.imageData ? (
                          <button
                            type="button"
                            className="mb-1 block w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-400"
                            onClick={() => setPreviewSrc(m.imageData || null)}
                            title="Open full size"
                          >
                            <span
                              className={cn(
                                "flex max-h-64 items-center justify-center overflow-hidden rounded-xl",
                                mine ? "bg-black/20" : "bg-slate-100"
                              )}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                key={`img-${m.id}`}
                                src={m.imageData}
                                alt={m.imageName || "Photo"}
                                className="max-h-64 max-w-full cursor-zoom-in object-contain"
                                loading="eager"
                              />
                            </span>
                            <span
                              className={cn(
                                "mt-1 block text-center text-[11px]",
                                mine ? "text-blue-100" : "text-slate-400"
                              )}
                            >
                              Tap to view full screenshot
                            </span>
                          </button>
                        ) : null}
                        {showText && m.text ? (
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {m.text}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {showEmoji ? (
                <div className="flex shrink-0 flex-wrap gap-1 border-t border-slate-100 bg-white px-3 py-2">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className="rounded-lg px-2 py-1 text-lg hover:bg-slate-100"
                      onClick={() => setText((t) => t + e)}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              ) : null}

              <form
                onSubmit={onSend}
                className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white p-3"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    void onPickImage(f);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={sending}
                  onClick={() => setShowEmoji((v) => !v)}
                >
                  😊
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={sending}
                  onClick={() => fileRef.current?.click()}
                >
                  📷
                </Button>
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

      {previewSrc ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/85 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setPreviewSrc(null)}
        >
          {/* Always-visible close — never clipped by tall images */}
          <button
            type="button"
            className="absolute right-3 top-3 z-[210] flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-bold leading-none text-slate-800 shadow-lg hover:bg-slate-100 sm:right-6 sm:top-6"
            aria-label="Close"
            onClick={() => setPreviewSrc(null)}
          >
            ×
          </button>

          <div
            className="relative flex max-h-[min(88vh,900px)] w-full max-w-[min(920px,96vw)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">
                Screenshot / photo
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={previewSrc}
                  download="chat-photo.jpg"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Download
                </a>
                <button
                  type="button"
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                  onClick={() => setPreviewSrc(null)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt="Full size"
                className="mx-auto max-h-[min(72vh,720px)] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function InboxPage() {
  return (
    <SearchParamsBoundary>
      <InboxPageInner />
    </SearchParamsBoundary>
  );
}
