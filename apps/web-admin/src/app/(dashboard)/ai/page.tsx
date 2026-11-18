"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
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

export default function AiAdminPage() {
  const [data, setData] = useState<Usage | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assist, setAssist] = useState<AssistMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingTx, setLoadingTx] = useState(true);

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
      setAssist((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);
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
        <h2 className="text-xl font-semibold">AI Study Coach</h2>
        <p className="text-sm text-slate-500">
          See what students asked, and use Admin Copilot for ops priorities.
          Keys stay on Render — this page never stores secrets.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500">Mode</p>
          <p className="mt-1 text-lg font-semibold capitalize">
            {data?.status.mode ?? "-"}
          </p>
          <Badge
            className="mt-2"
            variant={data?.status.providerConfigured ? "success" : "secondary"}
          >
            {data?.status.providerConfigured
              ? "Cloud key configured"
              : "Local coach only"}
          </Badge>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500">Model</p>
          <p className="mt-1 text-lg font-semibold">{data?.status.model ?? "-"}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500">Requests (7 days)</p>
          <p className="mt-1 text-lg font-semibold">
            {data?.weekRequests ?? "-"}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500">Daily limit / user</p>
          <p className="mt-1 text-lg font-semibold">
            {data?.status.dailyLimit ?? "-"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card flex min-h-[420px] flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">Admin Copilot</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Read-only helper — suggests what to do next (fees, tickets,
                enrollments). Does not change data for you.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/fees">Fees</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/inbox">Inbox</Link>
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {ADMIN_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={sending}
                onClick={() => void askAssist(p)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-xl bg-slate-50/80 p-3">
            {assist.length === 0 ? (
              <p className="text-sm text-slate-500">
                Ask things like “who has overdue fees?” or “what are students
                asking the coach?”
              </p>
            ) : (
              assist.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={`max-w-[95%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "ml-auto bg-blue-600 text-white"
                      : "bg-white text-slate-800 ring-1 ring-slate-200"
                  }`}
                >
                  {m.content}
                </div>
              ))
            )}
            {sending ? (
              <p className="text-xs font-medium text-slate-500">Thinking…</p>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="mt-3 flex gap-2">
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
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Student transcripts</h3>
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
              Refresh
            </Button>
          </div>

          <ul className="mt-4 max-h-[480px] space-y-3 overflow-y-auto pr-1">
            {loadingTx && transcripts.length === 0 ? (
              <li className="text-sm text-slate-500">Loading…</li>
            ) : null}
            {!loadingTx && transcripts.length === 0 ? (
              <li className="text-sm text-slate-500">No chats yet</li>
            ) : null}
            {transcripts.map((t) => {
              const mine = t.role === "user";
              return (
                <li
                  key={t.id}
                  className="rounded-xl border border-slate-100 bg-white p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">
                      {t.user.name || t.user.email}
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {t.user.accountType}
                      </span>
                    </p>
                    <span className="text-[11px] text-slate-400">
                      {new Date(t.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {mine ? "Student asked" : "AI replied"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">
                    {t.content}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="font-semibold">Top users (7 days)</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {(data?.topUsers ?? []).map((u) => (
            <li
              key={u.userId}
              className="flex justify-between gap-3 border-t border-slate-100 pt-2"
            >
              <span className="truncate">{u.name || u.email || u.userId}</span>
              <span className="font-medium">{u.count}</span>
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
      </div>
    </div>
  );
}
