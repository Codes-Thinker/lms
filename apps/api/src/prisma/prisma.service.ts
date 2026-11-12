import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger(PrismaService.name);

  async onModuleInit() {
    // Non-blocking: API can boot even if Supabase/IPv6 is briefly unreachable.
    void this.connectWithRetry();
  }

  private async connectWithRetry() {
    for (let i = 1; i <= 8; i++) {
      try {
        await this.$connect();
        this.log.log("Database connected");
        return;
      } catch (e) {
        this.log.warn(
          `DB connect attempt ${i}/8 failed: ${
            e instanceof Error ? e.message.split("\n")[0] : e
          }`
        );
        await new Promise((r) => setTimeout(r, 2000 * i));
      }
    }
    this.log.error("Database still unreachable — endpoints will error until reconnect");
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
