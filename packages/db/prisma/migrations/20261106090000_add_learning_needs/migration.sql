-- CreateEnum
CREATE TYPE "ELearningNeedsSyncStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SYNCED', 'FAILED');

-- CreateTable
CREATE TABLE "learning_needs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trial_lesson_booking_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "tutor_profile_id" UUID NOT NULL,
    "subject_snapshot" TEXT NOT NULL,
    "draft_answers" JSONB NOT NULL,
    "draft_revision" INTEGER NOT NULL DEFAULT 1,
    "shared_answers" JSONB,
    "shared_from_draft_revision" INTEGER,
    "shared_revision" INTEGER NOT NULL DEFAULT 0,
    "shared_at" TIMESTAMP(3),
    "user_dm_channel_id" UUID,
    "sync_status" "ELearningNeedsSyncStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "sync_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_sync_error" TEXT,
    "last_sync_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_needs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "learning_needs_trial_lesson_booking_id_key" ON "learning_needs"("trial_lesson_booking_id");
CREATE INDEX "learning_needs_student_id_updated_at_idx" ON "learning_needs"("student_id", "updated_at");
CREATE INDEX "learning_needs_tutor_profile_id_shared_at_idx" ON "learning_needs"("tutor_profile_id", "shared_at");
CREATE INDEX "learning_needs_user_dm_channel_id_shared_at_idx" ON "learning_needs"("user_dm_channel_id", "shared_at");

ALTER TABLE "learning_needs" ADD CONSTRAINT "learning_needs_trial_lesson_booking_id_fkey" FOREIGN KEY ("trial_lesson_booking_id") REFERENCES "trial_lesson_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_needs" ADD CONSTRAINT "learning_needs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_needs" ADD CONSTRAINT "learning_needs_tutor_profile_id_fkey" FOREIGN KEY ("tutor_profile_id") REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_needs" ADD CONSTRAINT "learning_needs_user_dm_channel_id_fkey" FOREIGN KEY ("user_dm_channel_id") REFERENCES "user_dm_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Keep draft/share/synchronization state internally consistent even when data
-- is written outside the application service.
ALTER TABLE "learning_needs" ADD CONSTRAINT "learning_needs_revision_check"
CHECK ("draft_revision" >= 1 AND "shared_revision" >= 0 AND "sync_attempts" >= 0);

ALTER TABLE "learning_needs" ADD CONSTRAINT "learning_needs_shared_snapshot_check"
CHECK (
  ("shared_at" IS NULL AND "shared_answers" IS NULL AND "shared_from_draft_revision" IS NULL AND "shared_revision" = 0)
  OR
  ("shared_at" IS NOT NULL AND "shared_answers" IS NOT NULL AND "shared_from_draft_revision" IS NOT NULL AND "shared_revision" >= 1)
);

ALTER TABLE "learning_needs" ADD CONSTRAINT "learning_needs_sync_state_check"
CHECK (
  ("sync_status" = 'NOT_REQUIRED')
  OR ("sync_status" IN ('PENDING', 'FAILED') AND "shared_at" IS NOT NULL)
  OR ("sync_status" = 'SYNCED' AND "shared_at" IS NOT NULL AND "user_dm_channel_id" IS NOT NULL)
);

ALTER TABLE "learning_needs" ADD CONSTRAINT "learning_needs_sync_error_check"
CHECK ("last_sync_error" IS NULL OR "last_sync_error" = 'MEZON_SYNC_FAILED');
