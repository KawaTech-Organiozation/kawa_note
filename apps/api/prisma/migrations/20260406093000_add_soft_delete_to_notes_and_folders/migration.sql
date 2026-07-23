ALTER TABLE "folders"
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "deleted_by_user_id" TEXT;

ALTER TABLE "notes"
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "deleted_by_user_id" TEXT;

CREATE INDEX "idx_folders_active_lookup"
  ON "folders"("tenant_id", "user_id", "deleted_at");

CREATE INDEX "idx_notes_active_lookup"
  ON "notes"("tenant_id", "user_id", "deleted_at");

CREATE INDEX "idx_notes_folder_active_lookup"
  ON "notes"("folder_id", "deleted_at");
