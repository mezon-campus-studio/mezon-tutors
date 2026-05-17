-- CreateEnum
CREATE TYPE "ESubscriptionLessonSlotStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ELessonSettlementKind" AS ENUM ('TRIAL_LESSON', 'SUBSCRIPTION_SLOT');

-- CreateEnum
CREATE TYPE "ELessonSettlementJobStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "subscription_slot_index" INTEGER;

-- CreateTable
CREATE TABLE "lesson_settlement_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "ELessonSettlementKind" NOT NULL,
    "booking_id" UUID,
    "enrollment_id" UUID,
    "slot_index" INTEGER,
    "run_at" TIMESTAMP(3) NOT NULL,
    "status" "ELessonSettlementJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "processed_at" TIMESTAMP(3),
    "dedupe_key" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_settlement_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_settlement_jobs_dedupe_key_key" ON "lesson_settlement_jobs"("dedupe_key");

-- CreateIndex
CREATE INDEX "lesson_settlement_jobs_status_run_at_idx" ON "lesson_settlement_jobs"("status", "run_at");

-- CreateIndex
CREATE INDEX "transactions_subscription_enrollment_id_subscription_slot_i_idx" ON "transactions"("subscription_enrollment_id", "subscription_slot_index", "type");
