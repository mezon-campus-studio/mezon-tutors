ALTER TABLE "subscription_enrollments"
  ADD COLUMN IF NOT EXISTS "member_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "group_discount_rate" DECIMAL(4,2);
