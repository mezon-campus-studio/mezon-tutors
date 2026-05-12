-- CreateEnum
CREATE TYPE "ESubscriptionEnrollmentStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'CANCELLED');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "subscription_enrollment_id" UUID;

-- CreateTable
CREATE TABLE "tutor_subscription_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tutor_id" UUID NOT NULL,
    "lessons_per_week" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutor_subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_subscription_plan_prices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id" UUID NOT NULL,
    "base_currency" "ECurrency" NOT NULL DEFAULT 'VND',
    "usd" DECIMAL(18,6) NOT NULL,
    "vnd" BIGINT NOT NULL,
    "php" DECIMAL(18,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutor_subscription_plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "tutor_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "ESubscriptionEnrollmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "weekly_slots" JSONB NOT NULL,
    "currency" "ECurrency",
    "gross_amount" BIGINT NOT NULL DEFAULT 0,
    "platform_fee" BIGINT NOT NULL DEFAULT 0,
    "tutor_amount" BIGINT NOT NULL DEFAULT 0,
    "payment_status" "EPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_ref" VARCHAR(50),
    "payment_url" TEXT,
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tutor_subscription_plans_tutor_id_idx" ON "tutor_subscription_plans"("tutor_id");

-- CreateIndex
CREATE UNIQUE INDEX "tutor_subscription_plans_tutor_id_lessons_per_week_key" ON "tutor_subscription_plans"("tutor_id", "lessons_per_week");

-- CreateIndex
CREATE UNIQUE INDEX "tutor_subscription_plan_prices_plan_id_key" ON "tutor_subscription_plan_prices"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_enrollments_payment_ref_key" ON "subscription_enrollments"("payment_ref");

-- CreateIndex
CREATE INDEX "subscription_enrollments_student_id_tutor_id_idx" ON "subscription_enrollments"("student_id", "tutor_id");

-- CreateIndex
CREATE INDEX "subscription_enrollments_plan_id_idx" ON "subscription_enrollments"("plan_id");

-- CreateIndex
CREATE INDEX "subscription_enrollments_payment_ref_idx" ON "subscription_enrollments"("payment_ref");

-- CreateIndex
CREATE INDEX "transactions_subscription_enrollment_id_idx" ON "transactions"("subscription_enrollment_id");

-- AddForeignKey
ALTER TABLE "tutor_subscription_plans" ADD CONSTRAINT "tutor_subscription_plans_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_subscription_plan_prices" ADD CONSTRAINT "tutor_subscription_plan_prices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "tutor_subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_enrollments" ADD CONSTRAINT "subscription_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_enrollments" ADD CONSTRAINT "subscription_enrollments_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_enrollments" ADD CONSTRAINT "subscription_enrollments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "tutor_subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subscription_enrollment_id_fkey" FOREIGN KEY ("subscription_enrollment_id") REFERENCES "subscription_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
