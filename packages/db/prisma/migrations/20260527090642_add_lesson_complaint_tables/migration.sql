-- CreateEnum
CREATE TYPE "ELessonComplaintStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "lesson_complaints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "tutor_id" UUID NOT NULL,
    "lesson_type" "ELessonChangeLessonType" NOT NULL,
    "reason" TEXT NOT NULL,
    "message" TEXT,
    "status" "ELessonComplaintStatus" NOT NULL DEFAULT 'PENDING',
    "trial_lesson_booking_id" UUID,
    "subscription_enrollment_id" UUID,
    "subscription_slot_index" INTEGER,
    "lesson_start_at" TIMESTAMP(3) NOT NULL,
    "lesson_duration_minutes" INTEGER NOT NULL,
    "reviewed_by_user_id" UUID,
    "admin_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_complaints_trial_lesson_booking_id_key" ON "lesson_complaints"("trial_lesson_booking_id");

-- CreateIndex
CREATE INDEX "lesson_complaints_status_created_at_idx" ON "lesson_complaints"("status", "created_at");

-- CreateIndex
CREATE INDEX "lesson_complaints_student_id_created_at_idx" ON "lesson_complaints"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "lesson_complaints_tutor_id_created_at_idx" ON "lesson_complaints"("tutor_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_complaints_subscription_enrollment_id_subscription_s_key" ON "lesson_complaints"("subscription_enrollment_id", "subscription_slot_index", "lesson_start_at");

-- AddForeignKey
ALTER TABLE "lesson_complaints" ADD CONSTRAINT "lesson_complaints_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_complaints" ADD CONSTRAINT "lesson_complaints_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_complaints" ADD CONSTRAINT "lesson_complaints_trial_lesson_booking_id_fkey" FOREIGN KEY ("trial_lesson_booking_id") REFERENCES "trial_lesson_booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_complaints" ADD CONSTRAINT "lesson_complaints_subscription_enrollment_id_fkey" FOREIGN KEY ("subscription_enrollment_id") REFERENCES "subscription_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_complaints" ADD CONSTRAINT "lesson_complaints_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
