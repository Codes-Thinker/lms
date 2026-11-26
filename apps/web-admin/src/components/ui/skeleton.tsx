import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "lux-skeleton rounded-xl bg-blue-50",
        className
      )}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" aria-hidden>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-3xl bg-white/20" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-2xl bg-white/20" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Skeleton className="h-64 w-full rounded-3xl bg-white/20" />
        <Skeleton className="h-64 w-full rounded-3xl bg-white/20" />
      </div>
    </div>
  );
}
