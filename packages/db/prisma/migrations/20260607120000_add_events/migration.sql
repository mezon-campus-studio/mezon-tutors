-- CreateEnum
CREATE TYPE "EventPublishStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(120) NOT NULL,
    "publish_status" "EventPublishStatus" NOT NULL DEFAULT 'PENDING',
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3),
    "doors_open_at" TIMESTAMP(3),
    "is_online" BOOLEAN NOT NULL DEFAULT true,
    "city" VARCHAR(120),
    "country" VARCHAR(120),
    "venue" VARCHAR(255),
    "registration_url" TEXT NOT NULL,
    "cover_image_url" TEXT NOT NULL,
    "og_image_url" TEXT NOT NULL,
    "content_vi" JSONB NOT NULL,
    "content_en" JSONB,
    "rejected_reason" TEXT,
    "published_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "reviewed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_organizers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(255) NOT NULL,
    "category" VARCHAR(120) NOT NULL,
    "bio" TEXT,
    "image_url" TEXT NOT NULL,
    "gradient" VARCHAR(80) NOT NULL DEFAULT 'from-violet-600 to-fuchsia-500',

    CONSTRAINT "event_organizers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_gallery_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "image_url" TEXT NOT NULL,
    "caption_vi" VARCHAR(500),
    "caption_en" VARCHAR(500),

    CONSTRAINT "event_gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "value" VARCHAR(50) NOT NULL,
    "label_vi" VARCHAR(120) NOT NULL,
    "label_en" VARCHAR(120),

    CONSTRAINT "event_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_publish_status_start_at_idx" ON "events"("publish_status", "start_at");

-- CreateIndex
CREATE INDEX "events_created_by_id_idx" ON "events"("created_by_id");

-- CreateIndex
CREATE INDEX "event_organizers_event_id_idx" ON "event_organizers"("event_id");

-- CreateIndex
CREATE INDEX "event_gallery_images_event_id_idx" ON "event_gallery_images"("event_id");

-- CreateIndex
CREATE INDEX "event_stats_event_id_idx" ON "event_stats"("event_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_gallery_images" ADD CONSTRAINT "event_gallery_images_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_stats" ADD CONSTRAINT "event_stats_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
