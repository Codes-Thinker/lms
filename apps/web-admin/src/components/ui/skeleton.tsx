import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-slate-200/80",
        className
      )}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" aria-hidden>
      <Skeleton className="h-28 w-full rounded-3xl" />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
