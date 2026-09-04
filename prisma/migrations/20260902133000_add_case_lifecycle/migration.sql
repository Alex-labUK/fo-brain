-- AlterTable
ALTER TABLE "Case" ADD COLUMN "lifecycleState" TEXT NOT NULL DEFAULT 'under_analysis';
ALTER TABLE "Case" ADD COLUMN "blockerType" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "Case" ADD COLUMN "blockerNote" TEXT;
ALTER TABLE "Case" ADD COLUMN "lifecycleUpdatedAt" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';

-- Backfill lifecycleUpdatedAt from the case's last update time.
UPDATE "Case" SET "lifecycleUpdatedAt" = "updatedAt";
