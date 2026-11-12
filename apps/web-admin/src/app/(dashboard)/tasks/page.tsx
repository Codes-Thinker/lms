"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Staff task assign UI lives on /staff */
export default function TasksRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/staff");
  }, [router]);
  return (
    <div className="glass-card flex min-h-[240px] items-center justify-center p-8 text-sm text-slate-500">
      Redirecting to Staff task assign…
    </div>
  );
}
