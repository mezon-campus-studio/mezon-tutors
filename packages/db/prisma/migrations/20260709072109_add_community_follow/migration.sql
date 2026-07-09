/*
  Warnings:

  - You are about to drop the column `bookmark_count` on the `community_posts` table. All the data in the column will be lost.
  - You are about to drop the `community_bookmarks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "community_bookmarks" DROP CONSTRAINT "community_bookmarks_post_id_fkey";

-- DropForeignKey
ALTER TABLE "community_bookmarks" DROP CONSTRAINT "community_bookmarks_user_id_fkey";

-- AlterTable
ALTER TABLE "community_posts" DROP COLUMN "bookmark_count";

-- DropTable
DROP TABLE "community_bookmarks";

-- CreateTable
CREATE TABLE "community_follows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "follower_id" UUID NOT NULL,
    "followee_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_follows_follower_id_created_at_idx" ON "community_follows"("follower_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "community_follows_followee_id_created_at_idx" ON "community_follows"("followee_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "community_follows_follower_id_followee_id_key" ON "community_follows"("follower_id", "followee_id");

-- AddForeignKey
ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
