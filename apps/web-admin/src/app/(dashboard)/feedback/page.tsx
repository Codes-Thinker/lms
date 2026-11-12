"use client";

import { useMemo, useState } from "react";
import {
  activeSurvey,
  feedbackItems as initialFeedback,
  surveyResponses as initialResponses,
} from "@/lib/mock-data";
import type { FeedbackItem, SurveyResponse } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/components/ui/snackbar";
import { useNotifications } from "@/components/ui/notifications-provider";

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>(initialFeedback);
  const [responses] = useState<SurveyResponse[]>(initialResponses);
  const [tab, setTab] = useState<"REPORT" | "COMPLAIN" | "SURVEY">("REPORT");
  const { show } = useSnackbar();
  const { push } = useNotifications();

  const filtered = useMemo(
    () => items.filter((i) => i.kind === tab),
    [items, tab]
  );

  function setStatus(id: string, status: FeedbackItem["status"]) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    show(`Marked ${status}`);
    push({ title: "Feedback updated", body: `Item → ${status}`, type: "system" });
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Reports · Complains · Surveys</h2>
        <p className="text-sm text-slate-500">
          Everything users submit from the app Help section
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["REPORT", "Reports"],
            ["COMPLAIN", "Complains"],
            ["SURVEY", "Survey fills"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "secondary"}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab !== "SURVEY" ? (
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No items yet</p>
            ) : (
              filtered.map((item) => (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {item.userName} · {item.userRole} ·{" "}
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={
                          item.status === "CLOSED"
                            ? "success"
                            : item.status === "REVIEWED"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {item.status}
                      </Badge>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setStatus(item.id, "REVIEWED")}>
                          Review
                        </Button>
                        <Button size="sm" onClick={() => setStatus(item.id, "CLOSED")}>
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="font-semibold">{activeSurvey.title}</h3>
            <p className="text-sm text-slate-500">{activeSurvey.description}</p>
            <p className="mt-2 text-sm font-medium text-blue-600">
              {responses.length} user(s) completed
            </p>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-slate-100">
              {responses.map((r) => (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{r.userName}</p>
                    <Badge variant="secondary">{r.userRole}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(r.submittedAt).toLocaleString()}
                  </p>
                  <div className="mt-3 space-y-2">
                    {activeSurvey.questions.map((q) => (
                      <div key={q.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                        <p className="text-xs text-slate-500">{q.text}</p>
                        <p className="font-medium">{r.answers[q.id] ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
