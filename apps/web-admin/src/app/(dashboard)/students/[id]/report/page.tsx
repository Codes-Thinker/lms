"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy URL — profiles live at /users/[id]. */
export default function StudentReportRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) router.replace(`/users/${params.id}`);
  }, [params?.id, router]);

  return (
    <div className="p-5 text-sm text-slate-500">Opening student profile…</div>
  );
}
