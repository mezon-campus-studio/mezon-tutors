-- AlterEnum
ALTER TYPE "ELessonComplaintStatus" ADD VALUE 'TUTOR_REVIEW_REQUESTED';

-- CreateIndex
CREATE INDEX "lesson_complaints_tutor_id_status_idx" ON "lesson_complaints"("tutor_id", "status");
