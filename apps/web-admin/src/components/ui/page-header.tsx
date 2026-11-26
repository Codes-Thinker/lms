import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** FastRide-style page title: bold H1 + muted subtitle + optional right meta. */
export function PageHeader({
  title,
  description,
  icon: Icon,
  meta,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {Icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#1C1410]/85 text-white shadow-lg shadow-black/20 ring-1 ring-white/25">
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
          ) : null}
          <h1 className="truncate text-2xl font-bold tracking-tight text-[#1C1410] sm:text-[28px]">
            {title}
          </h1>
        </div>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-[#1C1410]/55">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {meta}
        {actions}
      </div>
    </div>
  );
}

export function PageMetaPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-full border border-white/35 bg-white/35 px-3.5 py-1.5 text-sm text-[#1C1410]/70 backdrop-blur-md">
      <span className="font-medium text-[#1C1410]/55">{label}:</span>{" "}
      <span className="font-semibold text-[#1C1410]">{value}</span>
    </div>
  );
}
