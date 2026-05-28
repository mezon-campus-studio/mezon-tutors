-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "payout_bank_account_name" VARCHAR(255),
ADD COLUMN     "payout_bank_account_number" VARCHAR(50),
ADD COLUMN     "payout_bank_name" VARCHAR(100),
ADD COLUMN     "pendingWithdrawal" BIGINT NOT NULL DEFAULT 0;
