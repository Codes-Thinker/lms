import { Injectable } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PushService } from "./push.service";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService
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

    return row;
  }

  async notifyAdmins(input: {
    title: string;
    body: string;
    type?: NotificationType;
    data?: Record<string, string>;
  }) {
    const admins = await this.prisma.user.findMany({
      where: {
        OR: [
          { accountType: "SUPER_ADMIN" },
          { roles: { some: { role: { code: "SUPER_ADMIN" } } } },
        ],
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const results = [];
    for (const a of admins) {
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
}
