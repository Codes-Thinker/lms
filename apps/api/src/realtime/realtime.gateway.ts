import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { corsOriginDelegate } from "../common/cors";

type SocketUser = {
  sub: string;
  email?: string;
  accountType?: string;
  roles?: string[];
};

/**
 * Live notification channel (Socket.IO).
 * Connections require a valid JWT (auth.token / Authorization / query.token).
 * Rooms are always bound to the authenticated `sub` — clients cannot join other users.
 */
@WebSocketGateway({
  cors: { origin: corsOriginDelegate, credentials: true },
  path: "/realtime",
  transports: ["websocket", "polling"],
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Socket ${client.id} rejected: missing token`);
        client.disconnect(true);
        return;
      }
      const payload = this.jwt.verify<SocketUser>(token, {
        secret: this.config.getOrThrow<string>("JWT_SECRET"),
      });
      if (!payload?.sub) {
        client.disconnect(true);
        return;
      }
      client.data.user = payload;
      // Auto-join personal room so clients need not pass userId.
      void client.join(`user:${payload.sub}`);
      if (this.isSuperAdmin(payload)) {
        void client.join("admins");
      }
      this.logger.debug(`Socket ${client.id} authenticated as ${payload.sub}`);
    } catch (e) {
      this.logger.warn(
        `Socket ${client.id} rejected: ${e instanceof Error ? e.message : e}`
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket ${client.id} disconnected`);
  }

  /** Explicit join — ignores client-supplied userId; uses JWT sub only. */
  @SubscribeMessage("join")
  onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() _body?: { userId?: string }
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user?.sub) return { ok: false, error: "unauthorized" };
    void client.join(`user:${user.sub}`);
    return { ok: true, userId: user.sub };
  }

  @SubscribeMessage("joinAdmins")
  onJoinAdmins(@ConnectedSocket() client: Socket) {
    const user = client.data.user as SocketUser | undefined;
    if (!this.isSuperAdmin(user)) {
      return { ok: false, error: "forbidden" };
    }
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

  private isSuperAdmin(user?: SocketUser | null) {
    if (!user) return false;
    return (
      user.accountType === "SUPER_ADMIN" ||
      (user.roles ?? []).includes("SUPER_ADMIN")
    );
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token && typeof auth.token === "string") {
      return auth.token.trim();
    }
    const header = client.handshake.headers.authorization;
    if (typeof header === "string" && header.startsWith("Bearer ")) {
      return header.slice(7).trim();
    }
    const q = client.handshake.query?.token;
    if (typeof q === "string" && q.trim()) return q.trim();
    if (Array.isArray(q) && typeof q[0] === "string") return q[0].trim();
    return null;
  }
}
