-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "payment_proof_url" TEXT,
ADD COLUMN     "payment_proof_public_id" VARCHAR(255);
