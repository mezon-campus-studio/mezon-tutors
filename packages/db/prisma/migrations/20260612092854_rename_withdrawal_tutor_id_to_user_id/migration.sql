/*
  Warnings:

  - You are about to drop the column `tutor_id` on the `withdrawals` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `withdrawals` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "withdrawals" DROP CONSTRAINT "withdrawals_tutor_id_fkey";

-- DropIndex
DROP INDEX "withdrawals_tutor_id_status_idx";

-- AlterTable
ALTER TABLE "withdrawals" DROP COLUMN "tutor_id",
ADD COLUMN     "user_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "withdrawals_user_id_status_idx" ON "withdrawals"("user_id", "status");

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
