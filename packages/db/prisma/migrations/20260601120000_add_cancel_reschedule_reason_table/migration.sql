-- CreateEnum
CREATE TYPE "ELessonChangeAction" AS ENUM ('CANCEL', 'RESCHEDULE');

-- CreateEnum
CREATE TYPE "ELessonChangeLessonType" AS ENUM ('TRIAL', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "ELessonChangeInitiatorRole" AS ENUM ('STUDENT', 'TUTOR', 'SYSTEM');

-- CreateTable
CREATE TABLE "cancel_reschedule_reason" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "tutor_id" UUID NOT NULL,
    "initiated_by_user_id" UUID NOT NULL,
    "initiated_by_role" "ELessonChangeInitiatorRole" NOT NULL,
    "action" "ELessonChangeAction" NOT NULL,
    "lesson_type" "ELessonChangeLessonType" NOT NULL,
    "reason" TEXT NOT NULL,
    "message" TEXT,
    "trial_lesson_booking_id" UUID,
    "subscription_enrollment_id" UUID,
    "subscription_slot_index" INTEGER,
    "original_start_at" TIMESTAMP(3) NOT NULL,
    "original_duration_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancel_reschedule_reason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cancel_reschedule_reason_student_id_created_at_idx" ON "cancel_reschedule_reason"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "cancel_reschedule_reason_tutor_id_created_at_idx" ON "cancel_reschedule_reason"("tutor_id", "created_at");

-- CreateIndex
CREATE INDEX "cancel_reschedule_reason_trial_lesson_booking_id_idx" ON "cancel_reschedule_reason"("trial_lesson_booking_id");

-- CreateIndex
CREATE INDEX "cancel_reschedule_reason_subscription_enrollment_id_su_idx" ON "cancel_reschedule_reason"("subscription_enrollment_id", "subscription_slot_index", "original_start_at");

-- AddForeignKey
ALTER TABLE "cancel_reschedule_reason" ADD CONSTRAINT "cancel_reschedule_reason_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancel_reschedule_reason" ADD CONSTRAINT "cancel_reschedule_reason_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancel_reschedule_reason" ADD CONSTRAINT "cancel_reschedule_reason_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancel_reschedule_reason" ADD CONSTRAINT "cancel_reschedule_reason_trial_lesson_booking_id_fkey" FOREIGN KEY ("trial_lesson_booking_id") REFERENCES "trial_lesson_booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancel_reschedule_reason" ADD CONSTRAINT "cancel_reschedule_reason_subscription_enrollment_id_fkey" FOREIGN KEY ("subscription_enrollment_id") REFERENCES "subscription_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
