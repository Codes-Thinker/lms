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
}
