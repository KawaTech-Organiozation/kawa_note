ALTER TABLE "notes"
ADD COLUMN "metadata_status" TEXT NOT NULL DEFAULT 'idle',
ADD COLUMN "metadata_fetched_at" TIMESTAMP(3);
