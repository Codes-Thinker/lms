"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { initials, roleTone } from "@/lib/roles";

type Props = {
  name?: string | null;
  email?: string | null;
  accountType?: string | null;
  /** Optional remote/local avatar URL when available */
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
};

export function UserAvatar({
  name,
  email,
  accountType,
  src,
  size = "md",
  className,
}: Props) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [src]);
  const showPhoto = Boolean(src) && !broken;

  if (showPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src!}
        alt={name || email || "User"}
        className={cn(
          "shrink-0 rounded-full object-cover",
          sizes[size],
          className
        )}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizes[size],
        roleTone(accountType),
        className
      )}
      title={name || email || undefined}
    >
      {initials(name, email)}
    </div>
  );
}
