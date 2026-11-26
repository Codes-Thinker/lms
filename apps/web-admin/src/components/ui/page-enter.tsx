"use client";

import { cn } from "@/lib/utils";

/** Remounts on route change (layout passes key=pathname) → pop-in entrance. */
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
        "page-enter will-change-[transform,opacity,filter]",
        className
      )}
    >
      {children}
    </div>
  );
}
