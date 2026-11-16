-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "imageData" TEXT,
ADD COLUMN     "imageName" TEXT,
ALTER COLUMN "text" SET DEFAULT '';
