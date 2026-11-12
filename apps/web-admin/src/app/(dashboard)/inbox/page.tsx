"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Thread = {
  id: string;
  userName: string;
  userRole: string;
  lastMessage?: string | null;
  unreadByAdmin: number;
  updatedAt: string;
};

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Thread[]>("/support/chats")
      .then(setThreads)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold">Chat inbox</h2>
        <p className="text-sm text-slate-500">Admin threads from the app</p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>
      <div className="space-y-3">
        {threads.map((t) => (
          <div key={t.id} className="glass-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {t.userName} · {t.userRole}
                </p>
                <p className="text-sm text-slate-500">{t.lastMessage}</p>
              </div>
              {t.unreadByAdmin > 0 ? (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                  {t.unreadByAdmin}
                </span>
              ) : null}
            </div>
          </div>
        ))}
        {threads.length === 0 && !error ? (
          <p className="text-sm text-slate-500">No chats yet</p>
        ) : null}
      </div>
    </div>
  );
}
