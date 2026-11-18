-- Instructor / staff profile fields for course details.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "experience" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bio" TEXT;
