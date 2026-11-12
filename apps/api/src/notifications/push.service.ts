import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PushService implements OnModuleInit {
  private readonly log = new Logger(PushService.name);
  private ready = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit() {
    const raw = this.config.get<string>("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!raw?.trim()) {
      this.log.warn(
        "FIREBASE_SERVICE_ACCOUNT_JSON not set — push disabled until configured"
      );
      return;
    }
    try {
      const cred = this.parseServiceAccount(raw);
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(cred) });
      }
      this.ready = true;
      this.log.log("Firebase Admin ready for FCM");
    } catch (e) {
      this.log.error(
        `Firebase Admin init failed: ${e instanceof Error ? e.message : e}`
      );
    }
  }

  /** Tolerate Render paste quirks: quotes, double-encoding, KEY=value paste. */
  private parseServiceAccount(raw: string): admin.ServiceAccount {
    let s = raw.trim().replace(/^\uFEFF/, "");
    if (s.startsWith("FIREBASE_SERVICE_ACCOUNT_JSON=")) {
      s = s.slice("FIREBASE_SERVICE_ACCOUNT_JSON=".length).trim();
    }
    if (
      (s.startsWith("'") && s.endsWith("'")) ||
      (s.startsWith('"') && s.endsWith('"') && s[1] === "{")
    ) {
      s = s.slice(1, -1).trim();
    }
    let parsed: unknown = JSON.parse(s);
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    if (!parsed || typeof parsed !== "object") {
      throw new Error("service account JSON must be an object");
    }
    return parsed as admin.ServiceAccount;
  }

  async registerDevice(userId: string, token: string, platform = "android") {
    const t = token.trim();
    if (!t) return null;
    return this.prisma.fcmDevice.upsert({
      where: { token: t },
      update: { userId, platform },
      create: { userId, token: t, platform },
    });
  }

  async unregisterDevice(token: string) {
    await this.prisma.fcmDevice.deleteMany({ where: { token } });
    return { ok: true };
  }

  async sendToUser(
    userId: string,
    payload: {
      title: string;
      body: string;
      type: string;
      notificationId: string;
      data?: Record<string, string>;
    }
  ) {
    if (!this.ready) return { sent: 0, skipped: true };

    const devices = await this.prisma.fcmDevice.findMany({ where: { userId } });
    if (!devices.length) return { sent: 0 };

    const data: Record<string, string> = {
      notificationId: payload.notificationId,
      type: payload.type,
      userId,
      ...(payload.data ?? {}),
    };

    let sent = 0;
    for (const d of devices) {
      try {
        await admin.messaging().send({
          token: d.token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data,
          android: {
            priority: "high",
            notification: {
              channelId: "lms_default",
              clickAction: "FLUTTER_NOTIFICATION_CLICK",
            },
          },
        });
        sent += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.log.warn(`FCM fail for ${d.id}: ${msg}`);
        if (
          msg.includes("registration-token-not-registered") ||
          msg.includes("invalid-registration-token")
        ) {
          await this.prisma.fcmDevice.delete({ where: { id: d.id } }).catch(() => {});
        }
      }
    }
    return { sent };
  }
}
