-- CreateTable
CREATE TABLE "tutor_setup_checklists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tutor_id" UUID NOT NULL,
    "create_mezon_clan_complete" BOOLEAN NOT NULL DEFAULT false,
    "setup_mezon_clan_complete" BOOLEAN NOT NULL DEFAULT false,
    "channel_apps_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutor_setup_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutor_setup_checklists_tutor_id_key" ON "tutor_setup_checklists"("tutor_id");

-- AddForeignKey
ALTER TABLE "tutor_setup_checklists" ADD CONSTRAINT "tutor_setup_checklists_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
