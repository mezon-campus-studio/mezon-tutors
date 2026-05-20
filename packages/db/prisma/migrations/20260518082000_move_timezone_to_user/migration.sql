-- AlterTable
ALTER TABLE "tutor_profiles" DROP COLUMN "timezone";

-- AlterTable
ALTER TABLE "users" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';
