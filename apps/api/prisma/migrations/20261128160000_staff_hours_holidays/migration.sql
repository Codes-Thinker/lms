-- Staff working week config + geofence exit tracking + holidays

ALTER TABLE "OfficeConfig" ADD COLUMN IF NOT EXISTS "staffWorkingDays" TEXT NOT NULL DEFAULT '0,1,2,3,4,5';
ALTER TABLE "OfficeConfig" ADD COLUMN IF NOT EXISTS "staffOffDays" TEXT NOT NULL DEFAULT '6';
ALTER TABLE "OfficeConfig" ADD COLUMN IF NOT EXISTS "exitGraceMinutes" INTEGER NOT NULL DEFAULT 2;

-- Align singleton staff shift to 10:00–18:00 when still on legacy defaults
UPDATE "OfficeConfig"
SET "staffStartTime" = '10:00', "staffEndTime" = '18:00'
WHERE "id" = 1
  AND "staffStartTime" = '08:00'
  AND "staffEndTime" = '17:00';

ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "lastInsideAt" TIMESTAMP(3);
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "outsideSince" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "OfficeHoliday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfficeHoliday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OfficeHoliday_date_key" ON "OfficeHoliday"("date");
