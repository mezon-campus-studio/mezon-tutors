/*
  Warnings:

  - You are about to drop the column `currency` on the `tutor_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `price_per_hour` on the `tutor_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tutor_profiles" DROP COLUMN "currency",
DROP COLUMN "price_per_hour";

-- CreateTable
CREATE TABLE "trial_lesson_prices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tutor_id" UUID NOT NULL,
    "type" "ECurrency" NOT NULL DEFAULT 'VND',
    "usd" DECIMAL(18,6) NOT NULL,
    "vnd" BIGINT NOT NULL,
    "php" DECIMAL(18,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trial_lesson_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trial_lesson_prices_tutor_id_key" ON "trial_lesson_prices"("tutor_id");

-- AddForeignKey
ALTER TABLE "trial_lesson_prices" ADD CONSTRAINT "trial_lesson_prices_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
