-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "gross_amount" BIGINT;
ALTER TABLE "transactions" ADD COLUMN "tutor_amount" BIGINT;
ALTER TABLE "transactions" ADD COLUMN "platform_fee" BIGINT;
