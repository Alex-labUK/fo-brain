-- AlterTable
ALTER TABLE "Case" ADD COLUMN "executionStep" TEXT;
ALTER TABLE "Case" ADD COLUMN "executionOwner" TEXT;
ALTER TABLE "Case" ADD COLUMN "executionStatus" TEXT;
ALTER TABLE "Case" ADD COLUMN "executionUpdatedAt" DATETIME;
