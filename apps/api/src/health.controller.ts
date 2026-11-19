import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Controller()
export class RootController {
  @Get()
  root() {
    return {
      ok: true,
      service: "codesthinkerlms-api",
      health: "/health",
    };
  }
}

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true, db: "up" };
  }
}
