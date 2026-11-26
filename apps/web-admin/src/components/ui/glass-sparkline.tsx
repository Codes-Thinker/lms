"use client";

import { cn } from "@/lib/utils";

type GlassSparklineProps = {
  points?: number[];
  tone?: "emerald" | "rose" | "amber" | "white";
  className?: string;
};

const STROKES: Record<NonNullable<GlassSparklineProps["tone"]>, string> = {
  emerald: "#34d399",
  rose: "#fb7185",
  amber: "#fbbf24",
  white: "rgba(255,255,255,0.92)",
};

/** Tiny trend path for glass KPI cards. */
export function GlassSparkline({
  points = [8, 14, 11, 18, 15, 22, 19, 26],
  tone = "emerald",
  className,
}: GlassSparklineProps) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);
  const w = 72;
  const h = 28;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("sparkline shrink-0", className)}
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke={STROKES[tone]}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
