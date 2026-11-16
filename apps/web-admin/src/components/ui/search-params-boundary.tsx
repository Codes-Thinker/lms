"use client";

import { Suspense, type ReactNode } from "react";

/** Next.js requires Suspense around useSearchParams to avoid client crashes. */
export function SearchParamsBoundary({
  children,
  fallback = (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
      Loading…
    </div>
  ),
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
