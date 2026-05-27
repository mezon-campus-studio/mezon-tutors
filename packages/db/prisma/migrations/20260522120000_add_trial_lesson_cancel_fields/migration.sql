-- AlterTable
ALTER TABLE "trial_lesson_booking" ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT,
ADD COLUMN IF NOT EXISTS "cancel_message" TEXT;
