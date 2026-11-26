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

export function getAdminSocket(): Socket | null {
  return socket;
}

/** Connect admin browser to Socket.IO `/realtime` for live notifications. */
export function connectAdminRealtime(opts: {
  onNotification?: (payload: Record<string, unknown>) => void;
  onChatMessage?: (payload: Record<string, unknown>) => void;
  onLeaveUpdated?: (payload: Record<string, unknown>) => void;
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
    const user = getAdminUser();
    if (user?.id) socket?.emit("join", { userId: user.id });
    socket?.emit("joinAdmins");
  });

  socket.on("notification", (payload: Record<string, unknown>) => {
    opts.onNotification?.(payload);
  });

  socket.on("chat:message", (payload: Record<string, unknown>) => {
    opts.onChatMessage?.(payload);
  });

  socket.on("leave:updated", (payload: Record<string, unknown>) => {
    opts.onLeaveUpdated?.(payload);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("lms:leave-updated", { detail: payload })
      );
    }
  });

  return () => {
    socket?.disconnect();
    socket = null;
  };
}

export function joinChatThread(threadId: string) {
  if (!threadId || !socket?.connected) return;
  socket.emit("chat:join", { threadId });
}

export function leaveChatThread(threadId: string) {
  if (!threadId || !socket) return;
  socket.emit("chat:leave", { threadId });
}

export function emitChatTyping(input: {
  threadId: string;
  userId?: string;
  typing: boolean;
}) {
  if (!input.threadId || !socket?.connected) return;
  socket.emit("chat:typing", {
    threadId: input.threadId,
    userId: input.userId,
    typing: input.typing,
  });
}
