"use client";

import { cn } from "@/lib/utils";

export function PageEnter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("page-enter", className)}>{children}</div>;
}
