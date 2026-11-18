"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, RefreshCw } from "lucide-react";
import { AiRichText, plainAiText } from "@/components/ai-rich-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

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
  const [data, setData] = useState<Usage | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assist, setAssist] = useState<AssistMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingTx, setLoadingTx] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEnd = useRef<HTMLDivElement | null>(null);

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
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [assist, sending]);

  async function markCopied(id: string) {
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1400);
  }

  async function askAssist(text: string) {
    const message = text.trim();
    if (message.length < 2 || sending) return;
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
    <div className="page-enter space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          AI Study Coach
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Ops copilot + student chat transcripts. Keys stay on Render.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Mode",
            value: data?.status.mode ?? "—",
            extra: (
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
            ),
          },
          {
            label: "Model",
            value: data?.status.model ?? "—",
            extra: null,
          },
          {
            label: "Requests (7 days)",
            value: data?.weekRequests ?? "—",
            extra: null,
          },
          {
            label: "Daily limit / user",
            value: data?.status.dailyLimit ?? "—",
            extra: null,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/5"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {card.label}
            </p>
            <p className="mt-1 truncate text-lg font-semibold capitalize text-slate-900">
              {card.value}
            </p>
            {card.extra}
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Admin Copilot */}
        <section className="flex min-h-[460px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="font-semibold text-slate-900">Admin Copilot</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Read-only — suggests next actions, never changes data.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/fees">Fees</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/inbox">Inbox</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 px-5 pt-3">
            {ADMIN_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={sending}
                onClick={() => void askAssist(p)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-3 flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-4 py-3">
            {assist.length === 0 ? (
              <div className="flex h-full min-h-[160px] items-center justify-center px-4 text-center text-sm text-slate-500">
                Ask about fees, tickets, enrollments, or student AI prompts.
              </div>
            ) : (
              assist.map((m, i) => {
                const id = `assist-${i}`;
                const isUser = m.role === "user";
                return (
                  <div
                    key={id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                        isUser
                          ? "rounded-br-md bg-blue-600 text-white"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      {!isUser ? (
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Copilot
                          </span>
                          <button
                            type="button"
                            title="Copy reply"
                            onClick={async () => {
                              if (await copyText(m.content)) void markCopied(id);
                            }}
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                          >
                            <Copy className="h-3 w-3" />
                            {copiedId === id ? "Copied" : "Copy"}
                          </button>
                        </div>
                      ) : null}
                      {isUser ? (
                        <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                      ) : (
                        <AiRichText text={m.content} className="text-slate-700" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {sending ? (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500 shadow-sm">
                  Thinking…
                </div>
              </div>
            ) : null}
            <div ref={chatEnd} />
          </div>

          <form
            onSubmit={onSubmit}
            className="flex gap-2 border-t border-slate-100 bg-white p-4"
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask Admin Copilot…"
              className="min-h-[44px] flex-1 resize-none rounded-xl border-slate-200"
              rows={2}
              disabled={sending}
            />
            <Button type="submit" disabled={sending || draft.trim().length < 2}>
              Ask
            </Button>
          </form>
        </section>

        {/* Student transcripts */}
        <section className="flex min-h-[460px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="font-semibold text-slate-900">Student transcripts</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Who asked what — and what the coach replied.
              </p>
            </div>
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

          <ul className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {loadingTx && transcripts.length === 0 ? (
              <li className="py-10 text-center text-sm text-slate-500">
                Loading…
              </li>
            ) : null}
            {!loadingTx && transcripts.length === 0 ? (
              <li className="py-10 text-center text-sm text-slate-500">
                No chats yet
              </li>
            ) : null}
            {transcripts.map((t) => {
              const student = t.role === "user";
              return (
                <li
                  key={t.id}
                  className={`rounded-2xl border p-3.5 ${
                    student
                      ? "border-blue-100 bg-blue-50/50"
                      : "border-slate-100 bg-slate-50/70"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {t.user.name || t.user.email}
                      <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
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
                          title="Copy reply"
                          onClick={async () => {
                            if (await copyText(t.content)) void markCopied(t.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-white hover:text-blue-700"
                        >
                          <Copy className="h-3 w-3" />
                          {copiedId === t.id ? "Copied" : "Copy"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {student ? "Student asked" : "AI replied"}
                  </p>
                  <div className="mt-1.5">
                    {student ? (
                      <p className="whitespace-pre-wrap text-sm text-slate-700">
                        {t.content}
                      </p>
                    ) : (
                      <AiRichText text={t.content} className="text-slate-700" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/5">
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
        {(data?.weekFailures ?? 0) > 0 ? (
          <p className="mt-3 text-xs text-amber-700">
            {data?.weekFailures} failed provider calls this week (local fallback
            may have been used).
          </p>
        ) : null}
      </section>
    </div>
  );
}
