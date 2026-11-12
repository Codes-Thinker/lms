"use client";

import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/** PDF / document style placeholder when a course has no cover image. */
export function CourseDocCover({
  title,
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50",
        className
      )}
    >
      <div className="absolute inset-x-6 top-4 h-2 rounded-full bg-rose-500/80" />
      <div className="relative flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <FileText className="h-8 w-8 text-rose-500" strokeWidth={1.5} />
        <p className="max-w-[10rem] truncate text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          PDF document
        </p>
        {title ? (
          <p className="max-w-[11rem] truncate text-center text-xs font-medium text-slate-700">
            {title}
          </p>
        ) : null}
      </div>
      <div className="absolute inset-x-8 bottom-5 space-y-1.5 opacity-40">
        <div className="h-1 rounded bg-slate-300" />
        <div className="h-1 w-4/5 rounded bg-slate-300" />
        <div className="h-1 w-3/5 rounded bg-slate-300" />
      </div>
    </div>
  );
}
