/*
  Warnings:

  - You are about to drop the column `student_id` on the `user_dm_channels` table. All the data in the column will be lost.
  - You are about to drop the column `tutor_id` on the `user_dm_channels` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sender_id,recipient_id]` on the table `user_dm_channels` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `recipient_id` to the `user_dm_channels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender_id` to the `user_dm_channels` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "user_dm_channels" DROP CONSTRAINT "user_dm_channels_student_id_fkey";

-- DropForeignKey
ALTER TABLE "user_dm_channels" DROP CONSTRAINT "user_dm_channels_tutor_id_fkey";

-- DropIndex
DROP INDEX "user_dm_channels_student_id_idx";

-- DropIndex
DROP INDEX "user_dm_channels_student_id_tutor_id_key";

-- DropIndex
DROP INDEX "user_dm_channels_tutor_id_idx";

-- AlterTable
ALTER TABLE "user_dm_channels" DROP COLUMN "student_id",
DROP COLUMN "tutor_id",
ADD COLUMN     "recipient_id" UUID NOT NULL,
ADD COLUMN     "sender_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "user_dm_channels_sender_id_idx" ON "user_dm_channels"("sender_id");

-- CreateIndex
CREATE INDEX "user_dm_channels_recipient_id_idx" ON "user_dm_channels"("recipient_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_dm_channels_sender_id_recipient_id_key" ON "user_dm_channels"("sender_id", "recipient_id");

-- AddForeignKey
ALTER TABLE "user_dm_channels" ADD CONSTRAINT "user_dm_channels_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dm_channels" ADD CONSTRAINT "user_dm_channels_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
