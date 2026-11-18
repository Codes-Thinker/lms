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
        "mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {Icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
          ) : null}
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
            {title}
          </h1>
        </div>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p>
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
    <div className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-600">
      <span className="font-medium text-slate-500">{label}:</span>{" "}
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
