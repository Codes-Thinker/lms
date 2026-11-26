"use client";

import { cn } from "@/lib/utils";

/**
 * Remounts on route change (layout passes key=pathname).
 * Gives each sidebar tab a clean pop-in panel entrance.
 */
export function PageEnter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "page-enter will-change-[transform,opacity]",
        className
      )}
    >
      {children}
    </div>
  );
}
