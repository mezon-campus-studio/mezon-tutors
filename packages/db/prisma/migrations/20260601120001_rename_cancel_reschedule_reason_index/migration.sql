-- RenameIndex
-- Must run AFTER 20260601120000 creates the index. Guarded with IF EXISTS so it is
-- a no-op on databases where the index was already renamed or does not yet exist.
ALTER INDEX IF EXISTS "cancel_reschedule_reason_subscription_enrollment_id_su_idx"
  RENAME TO "cancel_reschedule_reason_subscription_enrollment_id_subscri_idx";
