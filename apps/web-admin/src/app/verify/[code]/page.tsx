"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type VerifyResult =
  | {
      valid: true;
      verificationCode: string;
      title: string;
      recipientName: string;
      courseTitle?: string | null;
      issuedAt: string;
      fingerprint: string;
    }
  | { valid: false; message: string };

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

export default function VerifyCertificatePage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code || "");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/certificates/verify/${encodeURIComponent(code)}`
        );
        const data = (await res.json()) as VerifyResult;
        if (!cancelled) setResult(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Verification failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-10">
      <div className="w-full max-w-lg animate-fade-up rounded-3xl border border-slate-100 bg-white p-8">
        <p className="text-sm font-medium text-blue-700">Code&apos;s Thinker LMS</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Certificate verification
        </h1>
        <p className="mt-1 text-sm text-slate-500">Code: {code}</p>

        {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}
        {!result && !error ? (
          <p className="mt-6 text-sm text-slate-500">Checking…</p>
        ) : null}

        {result && !result.valid ? (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {result.message || "This certificate could not be verified."}
          </div>
        ) : null}

        {result && result.valid ? (
          <div className="mt-6 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
            <p className="text-sm font-semibold text-emerald-800">Valid certificate</p>
            <div className="space-y-1 text-sm text-slate-700">
              <p>
                <span className="text-slate-500">Recipient:</span>{" "}
                {result.recipientName}
              </p>
              <p>
                <span className="text-slate-500">Title:</span> {result.title}
              </p>
              {result.courseTitle ? (
                <p>
                  <span className="text-slate-500">Course:</span>{" "}
                  {result.courseTitle}
                </p>
              ) : null}
              <p>
                <span className="text-slate-500">Issued:</span>{" "}
                {new Date(result.issuedAt).toLocaleDateString()}
              </p>
              <p className="font-mono text-xs text-slate-500">
                Fingerprint: {result.fingerprint}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
