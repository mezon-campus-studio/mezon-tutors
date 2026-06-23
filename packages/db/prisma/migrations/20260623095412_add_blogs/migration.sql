-- CreateEnum
CREATE TYPE "BlogPublishStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BlogUpdateReviewStatus" AS ENUM ('PENDING', 'REJECTED');

-- CreateTable
CREATE TABLE "blog_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,

    CONSTRAINT "blog_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(200) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "cover_image_url" TEXT,
    "seo_title" VARCHAR(120),
    "seo_description" VARCHAR(320),
    "og_image_url" TEXT,
    "reading_time" INTEGER NOT NULL DEFAULT 1,
    "publish_status" "BlogPublishStatus" NOT NULL DEFAULT 'PENDING',
    "rejected_reason" TEXT,
    "published_at" TIMESTAMP(3),
    "update_review_status" "BlogUpdateReviewStatus",
    "pending_update" JSONB,
    "update_rejected_reason" TEXT,
    "update_submitted_at" TIMESTAMP(3),
    "author_id" UUID NOT NULL,
    "reviewed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_id" UUID,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_comment_upvotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_comment_upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_upvotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BlogPostToBlogTag" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_BlogPostToBlogTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_tags_slug_key" ON "blog_tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_publish_status_created_at_idx" ON "blog_posts"("publish_status", "created_at");

-- CreateIndex
CREATE INDEX "blog_posts_author_id_idx" ON "blog_posts"("author_id");

-- CreateIndex
CREATE INDEX "blog_post_comments_post_id_created_at_idx" ON "blog_post_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "blog_post_comment_upvotes_comment_id_idx" ON "blog_post_comment_upvotes"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_post_comment_upvotes_comment_id_user_id_key" ON "blog_post_comment_upvotes"("comment_id", "user_id");

-- CreateIndex
CREATE INDEX "blog_post_upvotes_post_id_idx" ON "blog_post_upvotes"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_post_upvotes_post_id_user_id_key" ON "blog_post_upvotes"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "_BlogPostToBlogTag_B_index" ON "_BlogPostToBlogTag"("B");

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_comments" ADD CONSTRAINT "blog_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_comments" ADD CONSTRAINT "blog_post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_comments" ADD CONSTRAINT "blog_post_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "blog_post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_comment_upvotes" ADD CONSTRAINT "blog_post_comment_upvotes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "blog_post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_comment_upvotes" ADD CONSTRAINT "blog_post_comment_upvotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_upvotes" ADD CONSTRAINT "blog_post_upvotes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_upvotes" ADD CONSTRAINT "blog_post_upvotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogPostToBlogTag" ADD CONSTRAINT "_BlogPostToBlogTag_A_fkey" FOREIGN KEY ("A") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogPostToBlogTag" ADD CONSTRAINT "_BlogPostToBlogTag_B_fkey" FOREIGN KEY ("B") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
