import { Injectable } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { PushService } from "./push.service";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly realtime: RealtimeGateway
  ) {}

  async list(userId?: string) {
    return this.prisma.appNotification.findMany({
      where: userId
        ? { OR: [{ userId }, { userId: null }] }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async markRead(id: string) {
    return this.prisma.appNotification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.appNotification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { ok: true };
  }

  /**
   * Create in-app notification + FCM push to that user.
   * data payload includes: notificationId, type, userId (+ extra).
   */
  async notifyUser(input: {
    userId: string;
    title: string;
    body: string;
    type?: NotificationType;
    data?: Record<string, string>;
  }) {
    const type = input.type ?? NotificationType.GENERAL;
    const row = await this.prisma.appNotification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        type,
        data: input.data ?? undefined,
      },
    });

    await this.push.sendToUser(input.userId, {
      title: input.title,
      body: input.body,
      type,
      notificationId: row.id,
      data: input.data,
    });

    // Live dashboard/app update (Socket.IO) — complements FCM.
    this.realtime.emitToUser(input.userId, "notification", {
      id: row.id,
      title: input.title,
      body: input.body,
      type,
      data: input.data ?? {},
      createdAt: row.createdAt.toISOString(),
    });

    return row;
  }

  async notifyAdmins(input: {
    title: string;
    body: string;
    type?: NotificationType;
    data?: Record<string, string>;
  }) {
    return this.notifyStaffAndAdmins(input, { includeStaff: false });
  }

  /** SUPER_ADMIN + optional STAFF (HR), deduped by user id. */
  async notifyStaffAndAdmins(
    input: {
      title: string;
      body: string;
      type?: NotificationType;
      data?: Record<string, string>;
    },
    opts: { includeStaff?: boolean } = { includeStaff: true }
  ) {
    const or: Record<string, unknown>[] = [
      { accountType: "SUPER_ADMIN" },
      { roles: { some: { role: { code: "SUPER_ADMIN" } } } },
    ];
    if (opts.includeStaff !== false) {
      or.push(
        { accountType: "STAFF" },
        { roles: { some: { role: { code: "STAFF" } } } }
      );
    }
    const recipients = await this.prisma.user.findMany({
      where: { OR: or, status: "ACTIVE" },
      select: { id: true },
    });
    const seen = new Set<string>();
    const results = [];
    for (const a of recipients) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      results.push(
        await this.notifyUser({
          userId: a.id,
          title: input.title,
          body: input.body,
          type: input.type,
          data: input.data,
        })
      );
    }
    return results;
  }

  /** Broadcast a leave list refresh to connected admin/staff dashboards. */
  emitLeaveUpdated(payload: Record<string, string>) {
    this.realtime.emitToAdmins("leave:updated", payload);
  }
}
