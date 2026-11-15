-- Office geofence: 50m radius + role default shift times
ALTER TABLE "OfficeConfig" ALTER COLUMN "radiusMeters" SET DEFAULT 50;
UPDATE "OfficeConfig" SET "radiusMeters" = 50 WHERE "id" = 1;

ALTER TABLE "OfficeConfig" ADD COLUMN IF NOT EXISTS "studentStartTime" TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE "OfficeConfig" ADD COLUMN IF NOT EXISTS "studentEndTime" TEXT NOT NULL DEFAULT '14:00';
ALTER TABLE "OfficeConfig" ADD COLUMN IF NOT EXISTS "staffStartTime" TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE "OfficeConfig" ADD COLUMN IF NOT EXISTS "staffEndTime" TEXT NOT NULL DEFAULT '17:00';
ALTER TABLE "OfficeConfig" ADD COLUMN IF NOT EXISTS "internStartTime" TEXT NOT NULL DEFAULT '10:00';
ALTER TABLE "OfficeConfig" ADD COLUMN IF NOT EXISTS "internEndTime" TEXT NOT NULL DEFAULT '18:00';
