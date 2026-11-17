"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/components/ui/snackbar";
import { useAdminActivity } from "@/components/ui/admin-activity-provider";

type Ticket = {
  id: string;
  kind: string;
  userId: string;
  userName: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
};

type SurveyResponse = {
  id: string;
  userId?: string;
  userName: string;
  surveyTitle: string;
  answers?: Record<string, string>;
  submittedAt: string;
};

export default function FeedbackPage() {
  const { show } = useSnackbar();
  const { refresh: refreshBadges } = useAdminActivity();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [surveys, setSurveys] = useState<SurveyResponse[]>([]);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    const [t, s] = await Promise.all([
      api<Ticket[]>("/support/tickets"),
      api<SurveyResponse[]>("/support/survey/responses"),
    ]);
    setTickets(t);
    setSurveys(s);
    setLive(true);
  }, []);

  useEffect(() => {
    load().catch((e) => show(e instanceof Error ? e.message : "Failed"));
    const id = window.setInterval(() => {
      load().catch(() => {});
    }, 15000);
    return () => window.clearInterval(id);
  }, [load, show]);

  async function setStatus(id: string, status: string) {
    try {
      await api(`/support/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      show(`Ticket marked ${status}`);
      await load();
      await refreshBadges();
    } catch (e) {
      show(e instanceof Error ? e.message : "Update failed", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card glass-card-interactive flex flex-wrap items-start justify-between gap-3 p-5 animate-fade-up">
        <div>
          <h2 className="text-lg font-semibold">Feedback & support</h2>
          <p className="text-sm text-slate-500">
            Reports, complains and surveys from the app
          </p>
        </div>
        <Badge variant={live ? "success" : "secondary"}>
          {live ? "Live" : "Connecting"}
        </Badge>
      </div>

      <div className="space-y-3">
        {tickets.length === 0 ? (
          <div className="glass-card p-5 text-sm text-slate-500">
            No reports or complains yet
          </div>
        ) : (
          tickets.map((t, i) => (
            <div
              key={t.id}
              className={cn(
                "glass-card glass-card-interactive p-4 animate-fade-up",
                i < 6 ? `stagger-${i + 1}` : undefined
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {t.kind}: {t.title}
                </p>
                <Badge variant="secondary">{t.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                <Link
                  href={`/users/${t.userId}`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {t.userName}
                </Link>{" "}
                , {new Date(t.createdAt).toLocaleString()}
              </p>
              <p className="mt-2 text-sm whitespace-pre-wrap">{t.body}</p>
              {t.status !== "RESOLVED" && t.status !== "CLOSED" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setStatus(t.id, "IN_PROGRESS")}
                  >
                    In progress
                  </Button>
                  <Button size="sm" onClick={() => setStatus(t.id, "RESOLVED")}>
                    Resolve
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="glass-card p-5">
        <h3 className="mb-3 font-semibold">Survey responses</h3>
        {surveys.length === 0 ? (
          <p className="text-sm text-slate-500">No survey answers yet</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {surveys.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-slate-100 p-3"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">
                    {s.userId ? (
                      <Link
                        href={`/users/${s.userId}`}
                        className="text-blue-700 hover:underline"
                      >
                        {s.userName}
                      </Link>
                    ) : (
                      s.userName
                    )}{" "}
                    , {s.surveyTitle}
                  </span>
                  <span className="text-slate-500">
                    {new Date(s.submittedAt).toLocaleString()}
                  </span>
                </div>
                {s.answers ? (
                  <ul className="mt-2 space-y-1 text-slate-600">
                    {Object.entries(s.answers).map(([q, a]) => (
                      <li key={q}>
                        <span className="text-slate-400">{q}:</span> {a}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
