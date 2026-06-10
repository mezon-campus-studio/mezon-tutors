-- CreateEnum
CREATE TYPE "VocabularyWordStatus" AS ENUM ('ready', 'learning', 'learned');

-- CreateTable
CREATE TABLE "vocabulary_words" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "word" TEXT NOT NULL,
    "phonetic" TEXT,
    "part_of_speech" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "example" TEXT,
    "audio_url" TEXT,
    "status" "VocabularyWordStatus" NOT NULL DEFAULT 'ready',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_words_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vocabulary_words_student_id_word_idx" ON "vocabulary_words"("student_id", "word");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_words_student_id_word_definition_key" ON "vocabulary_words"("student_id", "word", "definition");

-- AddForeignKey
ALTER TABLE "vocabulary_words" ADD CONSTRAINT "vocabulary_words_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
