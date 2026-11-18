"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, RefreshCw, Sparkles, MessagesSquare, BarChart3 } from "lucide-react";
import { AiRichText, plainAiText } from "@/components/ai-rich-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Usage = {
  totalAllTime: number;
  weekRequests: number;
  weekFailures: number;
  topUsers: {
    userId: string;
    count: number;
    name: string | null;
    email: string | null;
  }[];
  status: {
    enabled: boolean;
    providerConfigured: boolean;
    model: string;
    dailyLimit: number;
    mode: string;
  };
};

type Transcript = {
  id: string;
  role: string;
  content: string;
  courseId: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    accountType: string;
  };
};

type AssistMsg = { role: "user" | "assistant"; content: string };
type TabId = "copilot" | "transcripts" | "stats";

const ADMIN_PROMPTS = [
  "What should I handle first today?",
  "Summarize overdue and due fees",
  "Any open tickets needing reply?",
  "What are students asking the AI coach?",
];

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(plainAiText(text));
    return true;
  } catch {
    return false;
  }
}

export default function AiAdminPage() {
  const [tab, setTab] = useState<TabId>("copilot");
  const [data, setData] = useState<Usage | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assist, setAssist] = useState<AssistMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingTx, setLoadingTx] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEnd = useRef<HTMLDivElement | null>(null);
  const txEnd = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const [usage, tx] = await Promise.all([
        api<Usage>("/ai/usage"),
        api<Transcript[]>("/ai/admin/transcripts?take=80"),
      ]);
      setData(usage);
      setTranscripts(tx);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoadingTx(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    if (tab === "copilot") {
      chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [assist, sending, tab]);

  useEffect(() => {
    if (tab === "transcripts") {
      txEnd.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [transcripts, tab]);

  async function markCopied(id: string) {
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1400);
  }

  async function askAssist(text: string) {
    const message = text.trim();
    if (message.length < 2 || sending) return;
    setTab("copilot");
    setSending(true);
    setDraft("");
    setAssist((prev) => [...prev, { role: "user", content: message }]);
    try {
      const res = await api<{ reply: string; mode: string }>("/ai/admin/assist", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setAssist((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setAssist((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            e instanceof Error
              ? e.message
              : "Admin assistant failed. Try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void askAssist(draft);
  }

  return (
    <div className="page-enter flex h-[calc(100dvh-7.25rem)] min-h-[520px] flex-col overflow-hidden">
      {/* Compact top bar — no tall page header stack */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            AI Study Coach
          </h2>
          <p className="truncate text-xs text-slate-500">
            {data?.status.providerConfigured
              ? `${data.status.model} · ${data.status.dailyLimit}/user/day`
              : "Local mode · set AI_API_KEY on Render"}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(
            [
              { id: "copilot", label: "Copilot", icon: Sparkles },
              { id: "transcripts", label: "Student chats", icon: MessagesSquare },
              { id: "stats", label: "Stats", icon: BarChart3 },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="mb-2 shrink-0 text-sm text-red-600">{error}</p>
      ) : null}

      {/* Single pane — ChatGPT style */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5">
        {tab === "copilot" ? (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
              <p className="text-xs text-slate-500">
                Read-only ops helper — never changes fees or tickets itself.
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/fees">Fees</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/inbox">Inbox</Link>
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
                {assist.length === 0 && !sending ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">
                      How can I help today?
                    </h3>
                    <p className="mt-1 max-w-md text-sm text-slate-500">
                      Ask about fees, tickets, enrollments, or what students are
                      asking the study coach.
                    </p>
                    <div className="mt-6 flex w-full max-w-lg flex-wrap justify-center gap-2">
                      {ADMIN_PROMPTS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          disabled={sending}
                          onClick={() => void askAssist(p)}
                          className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-left text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {assist.map((m, i) => {
                      const id = `assist-${i}`;
                      const isUser = m.role === "user";
                      return (
                        <div
                          key={id}
                          className={cn(
                            "flex w-full gap-3",
                            isUser ? "justify-end" : "justify-start"
                          )}
                        >
                          {!isUser ? (
                            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                              <Sparkles className="h-4 w-4" />
                            </div>
                          ) : null}
                          <div
                            className={cn(
                              "max-w-[min(100%,36rem)] rounded-2xl px-4 py-3",
                              isUser
                                ? "rounded-br-md bg-blue-600 text-white"
                                : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-800"
                            )}
                          >
                            {!isUser ? (
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Copilot
                                </span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (await copyText(m.content)) {
                                      void markCopied(id);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-white hover:text-blue-700"
                                >
                                  <Copy className="h-3 w-3" />
                                  {copiedId === id ? "Copied" : "Copy"}
                                </button>
                              </div>
                            ) : null}
                            {isUser ? (
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                {m.content}
                              </p>
                            ) : (
                              <AiRichText
                                text={m.content}
                                className="text-slate-700"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {sending ? (
                      <div className="flex gap-3">
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
                          Thinking…
                        </div>
                      </div>
                    ) : null}
                    <div ref={chatEnd} />
                  </>
                )}
              </div>
            </div>

            <form
              onSubmit={onSubmit}
              className="shrink-0 border-t border-slate-100 bg-white px-4 py-3"
            >
              <div className="mx-auto flex w-full max-w-3xl gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message Admin Copilot…"
                  className="min-h-[48px] max-h-32 flex-1 resize-none rounded-2xl border-slate-200 bg-slate-50 px-4 py-3"
                  rows={1}
                  disabled={sending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void askAssist(draft);
                    }
                  }}
                />
                <Button
                  type="submit"
                  className="h-12 rounded-2xl px-5"
                  disabled={sending || draft.trim().length < 2}
                >
                  Send
                </Button>
              </div>
            </form>
          </>
        ) : null}

        {tab === "transcripts" ? (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
              <p className="text-xs text-slate-500">
                Live student ↔ study coach messages
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoadingTx(true);
                  void load();
                }}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-5">
                {loadingTx && transcripts.length === 0 ? (
                  <p className="py-16 text-center text-sm text-slate-500">
                    Loading…
                  </p>
                ) : null}
                {!loadingTx && transcripts.length === 0 ? (
                  <p className="py-16 text-center text-sm text-slate-500">
                    No student chats yet
                  </p>
                ) : null}
                {[...transcripts].reverse().map((t) => {
                  const student = t.role === "user";
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "rounded-2xl border px-4 py-3",
                        student
                          ? "border-blue-100 bg-blue-50/60"
                          : "border-slate-200 bg-slate-50"
                      )}
                    >
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {t.user.name || t.user.email}
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {t.user.accountType}
                          </span>
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            {new Date(t.createdAt).toLocaleString()}
                          </span>
                          {!student ? (
                            <button
                              type="button"
                              onClick={async () => {
                                if (await copyText(t.content)) {
                                  void markCopied(t.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-white hover:text-blue-700"
                            >
                              <Copy className="h-3 w-3" />
                              {copiedId === t.id ? "Copied" : "Copy"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {student ? "Student asked" : "AI replied"}
                      </p>
                      {student ? (
                        <p className="whitespace-pre-wrap text-sm text-slate-700">
                          {t.content}
                        </p>
                      ) : (
                        <AiRichText text={t.content} className="text-slate-700" />
                      )}
                    </div>
                  );
                })}
                <div ref={txEnd} />
              </div>
            </div>
          </>
        ) : null}

        {tab === "stats" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Mode
                  </p>
                  <p className="mt-1 text-lg font-semibold capitalize text-slate-900">
                    {data?.status.mode ?? "—"}
                  </p>
                  <Badge
                    className="mt-2"
                    variant={
                      data?.status.providerConfigured ? "success" : "secondary"
                    }
                  >
                    {data?.status.providerConfigured
                      ? "Cloud key configured"
                      : "Local coach only"}
                  </Badge>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Requests (7 days)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {data?.weekRequests ?? "—"}
                  </p>
                  {(data?.weekFailures ?? 0) > 0 ? (
                    <p className="mt-2 text-xs text-amber-700">
                      {data?.weekFailures} provider failures this week
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold text-slate-900">Top users (7 days)</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {(data?.topUsers ?? []).map((u) => (
                    <li
                      key={u.userId}
                      className="flex justify-between gap-3 border-t border-slate-100 pt-2"
                    >
                      <span className="truncate text-slate-700">
                        {u.name || u.email || u.userId}
                      </span>
                      <span className="font-semibold text-slate-900">{u.count}</span>
                    </li>
                  ))}
                  {(data?.topUsers.length ?? 0) === 0 ? (
                    <li className="text-slate-500">No AI usage yet</li>
                  ) : null}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
