-- CreateTable
CREATE TABLE "saved_tutors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "tutor_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_tutors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_tutors_student_id_created_at_idx" ON "saved_tutors"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "saved_tutors_tutor_id_idx" ON "saved_tutors"("tutor_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_tutors_student_id_tutor_id_key" ON "saved_tutors"("student_id", "tutor_id");

-- AddForeignKey
ALTER TABLE "saved_tutors" ADD CONSTRAINT "saved_tutors_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_tutors" ADD CONSTRAINT "saved_tutors_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
