"use client";

import { io, Socket } from "socket.io-client";
import { getAdminUser, getToken } from "@/lib/api";

let socket: Socket | null = null;

function apiOrigin(): string {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  try {
    return new URL(base).origin;
  } catch {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }
}

/** Connect admin browser to Socket.IO `/realtime` for live notifications. */
export function connectAdminRealtime(opts: {
  onNotification?: (payload: Record<string, unknown>) => void;
}): () => void {
  const origin = apiOrigin();
  if (!origin) return () => {};

  const token = getToken();
  if (!token) return () => {};

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(origin, {
    path: "/realtime",
    transports: ["websocket", "polling"],
    withCredentials: true,
    auth: { token },
  });

  socket.on("connect", () => {
    // Server binds room from JWT; join is optional confirmation.
    const user = getAdminUser();
    if (user?.id) socket?.emit("join", { userId: user.id });
    socket?.emit("joinAdmins");
  });

  socket.on("notification", (payload: Record<string, unknown>) => {
    opts.onNotification?.(payload);
  });

  return () => {
    socket?.disconnect();
    socket = null;
  };
}
