-- CreateEnum
CREATE TYPE "CommunityPostType" AS ENUM ('POST', 'QUESTION', 'EXERCISE');

-- CreateEnum
CREATE TYPE "CommunityExerciseType" AS ENUM ('MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'READING', 'LISTENING');

-- CreateEnum
CREATE TYPE "CommunityExerciseDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "CommunityMediaType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "CommunityReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'MISINFORMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunityReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN');

-- CreateTable
CREATE TABLE "community_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "CommunityPostType" NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "upvote_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "bookmark_count" INTEGER NOT NULL DEFAULT 0,
    "submission_count" INTEGER NOT NULL DEFAULT 0,
    "hot_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "best_answer_comment_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_exercises" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "exercise_type" "CommunityExerciseType" NOT NULL,
    "difficulty" "CommunityExerciseDifficulty" NOT NULL DEFAULT 'INTERMEDIATE',
    "explanation" TEXT,
    "payload" JSONB NOT NULL,
    "correct_answer" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "type" "CommunityMediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "parent_id" UUID,
    "root_id" UUID,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "upvote_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_upvotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_comment_upvotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_comment_upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_exercise_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exercise_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "answer" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "is_correct" BOOLEAN,
    "ai_feedback" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_exercise_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_bookmarks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID,
    "comment_id" UUID,
    "reporter_id" UUID NOT NULL,
    "reason" "CommunityReportReason" NOT NULL,
    "description" TEXT,
    "status" "CommunityReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CommunityPostToCommunityTag" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_CommunityPostToCommunityTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_tags_slug_key" ON "community_tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "community_posts_best_answer_comment_id_key" ON "community_posts"("best_answer_comment_id");

-- CreateIndex
CREATE INDEX "community_posts_published_at_idx" ON "community_posts"("published_at" DESC);

-- CreateIndex
CREATE INDEX "community_posts_type_published_at_idx" ON "community_posts"("type", "published_at" DESC);

-- CreateIndex
CREATE INDEX "community_posts_author_id_created_at_idx" ON "community_posts"("author_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "community_posts_hot_score_published_at_idx" ON "community_posts"("hot_score" DESC, "published_at" DESC);

-- CreateIndex
CREATE INDEX "community_posts_upvote_count_published_at_idx" ON "community_posts"("upvote_count" DESC, "published_at" DESC);

-- CreateIndex
CREATE INDEX "community_posts_last_activity_at_idx" ON "community_posts"("last_activity_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "community_exercises_post_id_key" ON "community_exercises"("post_id");

-- CreateIndex
CREATE INDEX "community_exercises_exercise_type_idx" ON "community_exercises"("exercise_type");

-- CreateIndex
CREATE INDEX "community_post_media_post_id_sort_order_idx" ON "community_post_media"("post_id", "sort_order");

-- CreateIndex
CREATE INDEX "community_comments_post_id_created_at_idx" ON "community_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "community_comments_post_id_root_id_created_at_idx" ON "community_comments"("post_id", "root_id", "created_at");

-- CreateIndex
CREATE INDEX "community_comments_parent_id_idx" ON "community_comments"("parent_id");

-- CreateIndex
CREATE INDEX "community_comments_author_id_idx" ON "community_comments"("author_id");

-- CreateIndex
CREATE INDEX "community_post_upvotes_post_id_idx" ON "community_post_upvotes"("post_id");

-- CreateIndex
CREATE INDEX "community_post_upvotes_user_id_idx" ON "community_post_upvotes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_post_upvotes_post_id_user_id_key" ON "community_post_upvotes"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "community_comment_upvotes_comment_id_idx" ON "community_comment_upvotes"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_comment_upvotes_comment_id_user_id_key" ON "community_comment_upvotes"("comment_id", "user_id");

-- CreateIndex
CREATE INDEX "community_exercise_submissions_exercise_id_created_at_idx" ON "community_exercise_submissions"("exercise_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "community_exercise_submissions_user_id_created_at_idx" ON "community_exercise_submissions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "community_exercise_submissions_exercise_id_user_id_key" ON "community_exercise_submissions"("exercise_id", "user_id");

-- CreateIndex
CREATE INDEX "community_bookmarks_user_id_created_at_idx" ON "community_bookmarks"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "community_bookmarks_post_id_user_id_key" ON "community_bookmarks"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "community_reports_status_created_at_idx" ON "community_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "community_reports_post_id_idx" ON "community_reports"("post_id");

-- CreateIndex
CREATE INDEX "community_reports_comment_id_idx" ON "community_reports"("comment_id");

-- CreateIndex
CREATE INDEX "_CommunityPostToCommunityTag_B_index" ON "_CommunityPostToCommunityTag"("B");

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_best_answer_comment_id_fkey" FOREIGN KEY ("best_answer_comment_id") REFERENCES "community_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_exercises" ADD CONSTRAINT "community_exercises_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_media" ADD CONSTRAINT "community_post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_root_id_fkey" FOREIGN KEY ("root_id") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_upvotes" ADD CONSTRAINT "community_post_upvotes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_upvotes" ADD CONSTRAINT "community_post_upvotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comment_upvotes" ADD CONSTRAINT "community_comment_upvotes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comment_upvotes" ADD CONSTRAINT "community_comment_upvotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_exercise_submissions" ADD CONSTRAINT "community_exercise_submissions_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "community_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_exercise_submissions" ADD CONSTRAINT "community_exercise_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bookmarks" ADD CONSTRAINT "community_bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bookmarks" ADD CONSTRAINT "community_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommunityPostToCommunityTag" ADD CONSTRAINT "_CommunityPostToCommunityTag_A_fkey" FOREIGN KEY ("A") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommunityPostToCommunityTag" ADD CONSTRAINT "_CommunityPostToCommunityTag_B_fkey" FOREIGN KEY ("B") REFERENCES "community_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
