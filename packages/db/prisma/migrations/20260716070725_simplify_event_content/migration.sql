/*
  Warnings:

  - You are about to drop the column `caption_en` on the `event_gallery_images` table. All the data in the column will be lost.
  - You are about to drop the column `caption_vi` on the `event_gallery_images` table. All the data in the column will be lost.
  - You are about to drop the column `label_en` on the `event_stats` table. All the data in the column will be lost.
  - You are about to drop the column `label_vi` on the `event_stats` table. All the data in the column will be lost.
  - You are about to drop the column `content_en` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `content_vi` on the `events` table. All the data in the column will be lost.
  - Added the required column `label` to the `event_stats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "event_gallery_images" DROP COLUMN "caption_en",
DROP COLUMN "caption_vi",
ADD COLUMN     "caption" VARCHAR(500);

-- AlterTable
ALTER TABLE "event_stats" DROP COLUMN "label_en",
DROP COLUMN "label_vi",
ADD COLUMN     "label" VARCHAR(120) NOT NULL;

-- AlterTable
ALTER TABLE "events" DROP COLUMN "content_en",
DROP COLUMN "content_vi",
ADD COLUMN     "content" JSONB NOT NULL,
ADD COLUMN     "cover_image_crop" JSONB;
