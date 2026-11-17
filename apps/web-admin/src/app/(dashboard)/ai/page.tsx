"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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

export default function AiAdminPage() {
  const [data, setData] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<Usage>("/ai/usage");
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <div className="page-enter space-y-6">
      <div>
        <h2 className="text-xl font-semibold">AI Study Coach</h2>
        <p className="text-sm text-slate-500">
          Backend-only AI. Keys stay on the API. App works in local mode without a key.
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

      <div className="glass-card p-5">
        <h3 className="font-semibold">Top users (7 days)</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {(data?.topUsers ?? []).map((u) => (
            <li
              key={u.userId}
              className="flex justify-between gap-3 border-t border-slate-100 pt-2"
            >
              <span className="truncate">
                {u.name || u.email || u.userId}
              </span>
              <span className="font-medium">{u.count}</span>
            </li>
          ))}
          {(data?.topUsers.length ?? 0) === 0 ? (
            <li className="text-slate-500">No AI usage yet</li>
          ) : null}
        </ul>
        {(data?.weekFailures ?? 0) > 0 ? (
          <p className="mt-3 text-xs text-amber-700">
            {data?.weekFailures} failed provider calls this week (local fallback may have been used).
          </p>
        ) : null}
      </div>

      <div className="glass-card p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Setup</p>
        <p className="mt-1">
          Set <code className="rounded bg-slate-100 px-1">AI_API_KEY</code> on
          Render for cloud answers. Optional:{" "}
          <code className="rounded bg-slate-100 px-1">AI_MODEL</code>,{" "}
          <code className="rounded bg-slate-100 px-1">AI_BASE_URL</code>.
        </p>
      </div>
    </div>
  );
}
