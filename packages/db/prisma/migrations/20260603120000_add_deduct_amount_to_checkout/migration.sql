-- AlterTable
ALTER TABLE "trial_lesson_booking" ADD COLUMN "deduct_amount" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "subscription_enrollments" ADD COLUMN "deduct_amount" BIGINT NOT NULL DEFAULT 0;
