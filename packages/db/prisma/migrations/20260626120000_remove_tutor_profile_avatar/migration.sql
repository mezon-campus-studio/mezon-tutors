-- Drop avatar column from tutor_profiles; avatar is sourced from users.avatar
ALTER TABLE "tutor_profiles" DROP COLUMN "avatar";
