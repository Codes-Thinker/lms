-- CreateEnum
CREATE TYPE "PaymentPlanType" AS ENUM ('MONTHLY', 'TWO_INSTALLMENTS', 'CUSTOM');

-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'LEAVE';

-- AlterEnum
ALTER TYPE "FeeStatus" ADD VALUE 'WAIVED';

-- AlterTable
ALTER TABLE "FeeCase" ADD COLUMN     "amountPaid" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "courseDurationMonths" INTEGER,
ADD COLUMN     "installment1Amount" INTEGER,
ADD COLUMN     "installment2Amount" INTEGER,
ADD COLUMN     "paymentType" "PaymentPlanType",
ADD COLUMN     "totalCourseFee" INTEGER;

-- CreateTable
CREATE TABLE "FeeReminderLog" (
    "id" TEXT NOT NULL,
    "feeCaseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeReminderLog_sentAt_idx" ON "FeeReminderLog"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeeReminderLog_feeCaseId_kind_key" ON "FeeReminderLog"("feeCaseId", "kind");

-- AddForeignKey
ALTER TABLE "FeeReminderLog" ADD CONSTRAINT "FeeReminderLog_feeCaseId_fkey" FOREIGN KEY ("feeCaseId") REFERENCES "FeeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
