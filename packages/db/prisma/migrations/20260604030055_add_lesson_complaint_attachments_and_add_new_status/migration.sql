-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ELessonComplaintStatus" ADD VALUE 'TUTOR_CONFIRMED';
ALTER TYPE "ELessonComplaintStatus" ADD VALUE 'TUTOR_REJECTED';

-- AlterTable
ALTER TABLE "lesson_complaints" ADD COLUMN     "attachment_urls" JSONB DEFAULT '[]',
ADD COLUMN     "tutor_note" TEXT;
