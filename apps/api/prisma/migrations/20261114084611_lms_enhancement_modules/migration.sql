-- AlterEnum
ALTER TYPE "FeeStatus" ADD VALUE 'REJECTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "TaskStatus" ADD VALUE 'REVIEWED';

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "autoCheckout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "checkInDistance" DOUBLE PRECISION,
ADD COLUMN     "checkInLat" DOUBLE PRECISION,
ADD COLUMN     "checkInLng" DOUBLE PRECISION,
ADD COLUMN     "shiftEnd" TEXT,
ADD COLUMN     "shiftStart" TEXT;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "FeeCase" ADD COLUMN     "billingStart" DATE,
ADD COLUMN     "dueDay" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "monthlyFee" INTEGER,
ADD COLUMN     "paymentScreenshotData" TEXT,
ADD COLUMN     "paymentSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "reviewStatus" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerId" TEXT,
ADD COLUMN     "submissionFileData" TEXT,
ADD COLUMN     "submissionFileName" TEXT,
ADD COLUMN     "submissionText" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "feeDueDay" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "feeStartDate" DATE,
ADD COLUMN     "monthlyFee" INTEGER,
ADD COLUMN     "profileImage" TEXT;

-- CreateTable
CREATE TABLE "OfficeConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 29.3931779,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 71.6924333,
    "radiusMeters" INTEGER NOT NULL DEFAULT 100,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '08:00',
    "endTime" TEXT NOT NULL DEFAULT '17:00',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSubmission" (
    "id" TEXT NOT NULL,
    "feeCaseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "screenshotData" TEXT,
    "screenshotName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffSchedule_userId_key" ON "StaffSchedule"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseCategory_name_key" ON "CourseCategory"("name");

-- CreateIndex
CREATE INDEX "PaymentSubmission_feeCaseId_idx" ON "PaymentSubmission"("feeCaseId");

-- CreateIndex
CREATE INDEX "PaymentSubmission_studentId_idx" ON "PaymentSubmission"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceReminder_userId_date_key" ON "AttendanceReminder"("userId", "date");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CourseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSchedule" ADD CONSTRAINT "StaffSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_feeCaseId_fkey" FOREIGN KEY ("feeCaseId") REFERENCES "FeeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceReminder" ADD CONSTRAINT "AttendanceReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
