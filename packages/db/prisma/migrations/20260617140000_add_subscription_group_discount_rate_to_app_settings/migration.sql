ALTER TABLE "app_settings"
  ADD COLUMN IF NOT EXISTS "subscription_group_discount_rate" DECIMAL(4,2) NOT NULL DEFAULT 0.75;
