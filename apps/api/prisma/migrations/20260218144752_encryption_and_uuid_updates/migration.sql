-- AlterTable
ALTER TABLE "apps" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "folders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "notes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "preview_data" SET DATA TYPE TEXT,
ALTER COLUMN "tags" SET NOT NULL,
ALTER COLUMN "tags" SET DEFAULT '',
ALTER COLUMN "tags" SET DATA TYPE TEXT,
ALTER COLUMN "is_encrypted" SET DEFAULT true;

-- AlterTable
ALTER TABLE "relations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "encryption_salt" TEXT,
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
