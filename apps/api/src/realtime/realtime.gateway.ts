import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

/**
 * Lightweight live channel (Socket.IO).
 * Clients join `user:{id}` (and admins join `admins`) after login.
 * Push/FCM still remains the reliable delivery path.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  path: "/realtime",
  transports: ["websocket", "polling"],
})
export class RealtimeGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage("join")
  onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { userId?: string }
  ) {
    const userId = body?.userId?.trim();
    if (!userId) return { ok: false };
    void client.join(`user:${userId}`);
    return { ok: true };
  }

  @SubscribeMessage("joinAdmins")
  onJoinAdmins(@ConnectedSocket() client: Socket) {
    void client.join("admins");
    return { ok: true };
  }

  emitToUser(userId: string, event: string, payload: Record<string, unknown>) {
    if (!userId || !this.server) return;
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToAdmins(event: string, payload: Record<string, unknown>) {
    if (!this.server) return;
    this.server.to("admins").emit(event, payload);
  }
}
