-- CreateIndex
CREATE INDEX "tutor_profiles_verif_subject_idx" ON "tutor_profiles"("verification_status", "subject");

-- CreateIndex
CREATE INDEX "tutor_profiles_verif_country_idx" ON "tutor_profiles"("verification_status", "country");

-- CreateIndex
CREATE INDEX "tutor_profiles_verif_rating_idx" ON "tutor_profiles"("verification_status", "rating_average", "rating_count");
