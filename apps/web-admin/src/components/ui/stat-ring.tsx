"use client";

import { cn } from "@/lib/utils";

type StatRingProps = {
  value: number;
  max?: number;
  label: string;
  sublabel?: string;
  display?: string;
  tone?: "blue" | "emerald" | "amber" | "sky" | "rose";
  size?: number;
  className?: string;
};

const TONES: Record<
  NonNullable<StatRingProps["tone"]>,
  { stroke: string; soft: string; text: string }
> = {
  blue: { stroke: "#2563EB", soft: "#DBEAFE", text: "text-blue-700" },
  emerald: { stroke: "#059669", soft: "#D1FAE5", text: "text-emerald-700" },
  amber: { stroke: "#D97706", soft: "#FEF3C7", text: "text-amber-700" },
  sky: { stroke: "#0284C7", soft: "#E0F2FE", text: "text-sky-700" },
  rose: { stroke: "#E11D48", soft: "#FFE4E6", text: "text-rose-700" },
};

/** Circular progress ring for dashboard KPIs. */
export function StatRing({
  value,
  max = 100,
  label,
  sublabel,
  display,
  tone = "blue",
  size = 112,
  className,
}: StatRingProps) {
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  const offset = circumference * (1 - pct);
  const colors = TONES[tone];
  const centerLabel =
    display ??
    (max === 100 ? `${Math.round(value)}%` : String(Math.round(value)));

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 text-center",
        className
      )}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.soft}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-xl font-semibold tracking-tight", colors.text)}>
            {centerLabel}
          </span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {sublabel ? (
          <p className="text-xs text-slate-500">{sublabel}</p>
        ) : null}
      </div>
    </div>
  );
}
