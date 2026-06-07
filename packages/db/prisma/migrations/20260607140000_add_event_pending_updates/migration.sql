-- CreateEnum
CREATE TYPE "EventUpdateReviewStatus" AS ENUM ('PENDING', 'REJECTED');

-- AlterTable
ALTER TABLE "events"
ADD COLUMN "update_review_status" "EventUpdateReviewStatus",
ADD COLUMN "pending_update" JSONB,
ADD COLUMN "update_rejected_reason" TEXT,
ADD COLUMN "update_submitted_at" TIMESTAMP(3);
