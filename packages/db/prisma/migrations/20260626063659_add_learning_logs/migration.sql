-- CreateEnum
CREATE TYPE "ELearningAction" AS ENUM ('READY_TO_LEARNING', 'LEARNING_TO_LEARNED');

-- CreateTable
CREATE TABLE "learning_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "vocabulary_word_id" UUID NOT NULL,
    "action" "ELearningAction" NOT NULL,
    "learned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_key" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_logs_student_id_date_key_idx" ON "learning_logs"("student_id", "date_key" DESC);

-- AddForeignKey
ALTER TABLE "learning_logs" ADD CONSTRAINT "learning_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_logs" ADD CONSTRAINT "learning_logs_vocabulary_word_id_fkey" FOREIGN KEY ("vocabulary_word_id") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
