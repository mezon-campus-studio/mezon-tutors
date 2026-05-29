-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "platform_fee_percentage" DECIMAL(6,4) NOT NULL DEFAULT 0.2,
    "settlement_period_hours" INTEGER NOT NULL DEFAULT 72,
    "dispute_period_hours" INTEGER NOT NULL DEFAULT 72,
    "lesson_change_period_hours" INTEGER NOT NULL DEFAULT 12,
    "min_withdrawal_amount_vnd" BIGINT NOT NULL DEFAULT 10000,
    "min_withdrawal_amount_usd" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "min_withdrawal_amount_php" DECIMAL(18,6) NOT NULL DEFAULT 100,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
