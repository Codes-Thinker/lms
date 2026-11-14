import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  async getVersion() {
    return (
      (await this.prisma.appVersion.findUnique({ where: { id: 1 } })) ?? {
        id: 1,
        minVersion: "1.0.0",
        latestVersion: "1.0.0",
        forceUpdate: false,
        storeUrlAndroid: null,
        message: null,
      }
    );
  }

  async updateVersion(data: {
    minVersion?: string;
    latestVersion?: string;
    forceUpdate?: boolean;
    storeUrlAndroid?: string;
    message?: string;
  }) {
    return this.prisma.appVersion.upsert({
      where: { id: 1 },
      update: data,
      create: {
        id: 1,
        minVersion: data.minVersion ?? "1.0.0",
        latestVersion: data.latestVersion ?? "1.0.0",
        forceUpdate: data.forceUpdate ?? false,
        storeUrlAndroid: data.storeUrlAndroid,
        message: data.message,
      },
    });
  }

  async paymentInfo() {
    return this.prisma.paymentInfo.findUnique({ where: { id: 1 } });
  }

  async updatePaymentInfo(data: {
    adminName?: string;
    phone?: string;
    jazzCash?: string;
    easyPaisa?: string;
    bankTitle?: string;
    bankAccount?: string;
  }) {
    return this.prisma.paymentInfo.upsert({
      where: { id: 1 },
      update: data,
      create: {
        id: 1,
        adminName: data.adminName ?? "Admin",
        phone: data.phone ?? "",
        jazzCash: data.jazzCash,
        easyPaisa: data.easyPaisa,
        bankTitle: data.bankTitle,
        bankAccount: data.bankAccount,
      },
    });
  }

  // ── Office geofence configuration ──
  async getOfficeConfig() {
    let config = await this.prisma.officeConfig.findUnique({ where: { id: 1 } });
    if (!config) {
      config = await this.prisma.officeConfig.create({
        data: {
          id: 1,
          latitude: 29.3931779,
          longitude: 71.6924333,
          radiusMeters: 100,
          timezone: "Asia/Karachi",
        },
      });
    }
    return config;
  }

  async updateOfficeConfig(data: {
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    timezone?: string;
  }) {
    return this.prisma.officeConfig.upsert({
      where: { id: 1 },
      update: data,
      create: {
        id: 1,
        latitude: data.latitude ?? 29.3931779,
        longitude: data.longitude ?? 71.6924333,
        radiusMeters: data.radiusMeters ?? 100,
        timezone: data.timezone ?? "Asia/Karachi",
      },
    });
  }

  // ── Course categories (dynamic) ──
  async listCategories() {
    return this.prisma.courseCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async listAllCategories() {
    return this.prisma.courseCategory.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }

  async createCategory(data: { name: string; icon?: string; sortOrder?: number }) {
    return this.prisma.courseCategory.create({
      data: {
        name: data.name,
        icon: data.icon,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateCategory(
    id: string,
    data: { name?: string; icon?: string; sortOrder?: number; active?: boolean },
  ) {
    return this.prisma.courseCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    await this.prisma.course.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    return this.prisma.courseCategory.delete({ where: { id } });
  }

  // ── Staff work schedules ──
  async getSchedule(userId: string) {
    let schedule = await this.prisma.staffSchedule.findUnique({
      where: { userId },
    });
    if (!schedule) {
      schedule = await this.prisma.staffSchedule.create({
        data: { userId, startTime: "08:00", endTime: "17:00" },
      });
    }
    return schedule;
  }

  async upsertSchedule(
    userId: string,
    data: { startTime?: string; endTime?: string; active?: boolean },
  ) {
    return this.prisma.staffSchedule.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        startTime: data.startTime ?? "08:00",
        endTime: data.endTime ?? "17:00",
      },
    });
  }

  async listSchedules() {
    return this.prisma.staffSchedule.findMany({
      include: {
        user: {
          select: { id: true, fullName: true, email: true, accountType: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteSchedule(id: string) {
    return this.prisma.staffSchedule.delete({ where: { id } });
  }
}
