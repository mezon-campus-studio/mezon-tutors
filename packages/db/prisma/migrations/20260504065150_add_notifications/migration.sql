-- CreateEnum
CREATE TYPE "ENotificationType" AS ENUM ('BOOKING', 'PAYMENT', 'SYSTEM', 'LESSON_STARTING_SOON');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "ENotificationType" NOT NULL,
    "i18n_key" TEXT,
    "i18n_params" JSONB,
    "dedupe_key" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notification_recipients_notification_id_idx" ON "notification_recipients"("notification_id");

-- CreateIndex
CREATE INDEX "notification_recipients_user_id_is_read_idx" ON "notification_recipients"("user_id", "is_read");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_notification_id_user_id_key" ON "notification_recipients"("notification_id", "user_id");

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
