"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

type Ticket = {
  id: string;
  kind: string;
  userName: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
};

type SurveyResponse = {
  id: string;
  userName: string;
  surveyTitle: string;
  submittedAt: string;
};

export default function FeedbackPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [surveys, setSurveys] = useState<SurveyResponse[]>([]);

  useEffect(() => {
    Promise.all([
      api<Ticket[]>("/support/tickets"),
      api<SurveyResponse[]>("/support/survey/responses"),
    ]).then(([t, s]) => {
      setTickets(t);
      setSurveys(s);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Feedback</h2>
        <p className="text-sm text-slate-500">Reports, complains, survey answers</p>
      </div>
      <div className="space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="glass-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">
                {t.kind}: {t.title}
              </p>
              <Badge variant="secondary">{t.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {t.userName} · {new Date(t.createdAt).toLocaleString()}
            </p>
            <p className="mt-2 text-sm">{t.body}</p>
          </div>
        ))}
      </div>
      <div className="glass-card p-5">
        <h3 className="mb-3 font-semibold">Survey responses</h3>
        <ul className="space-y-2 text-sm">
          {surveys.map((s) => (
            <li key={s.id} className="flex justify-between border-t border-slate-100 pt-2">
              <span>
                {s.userName} · {s.surveyTitle}
              </span>
              <span className="text-slate-500">
                {new Date(s.submittedAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
