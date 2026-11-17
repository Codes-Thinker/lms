"use client";

import { cn } from "@/lib/utils";

export function PageEnter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("page-enter will-change-transform", className)}>
      {children}
    </div>
  );
}
