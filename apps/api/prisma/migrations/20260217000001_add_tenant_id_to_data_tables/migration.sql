-- Adicionar coluna tenant_id nas tabelas de dados
ALTER TABLE "folders" ADD COLUMN "tenant_id" VARCHAR(64);
ALTER TABLE "notes" ADD COLUMN "tenant_id" VARCHAR(64);
ALTER TABLE "relations" ADD COLUMN "tenant_id" VARCHAR(64);

-- Popular tenant_id com base no userId existente (dados legados)
UPDATE "folders" f SET "tenant_id" = (
  SELECT u."tenant_id" FROM "users" u WHERE u.id = f."user_id"
);
UPDATE "notes" n SET "tenant_id" = (
  SELECT u."tenant_id" FROM "users" u WHERE u.id = n."user_id"
);
UPDATE "relations" r SET "tenant_id" = (
  SELECT n."tenant_id" FROM "notes" n WHERE n.id = r."note_from_id"
);

-- Tornar NOT NULL após população
ALTER TABLE "folders" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "notes" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "relations" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Criar FKs
ALTER TABLE "folders" ADD CONSTRAINT "folders_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE;
ALTER TABLE "relations" ADD CONSTRAINT "relations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE;

-- Criar índices
CREATE INDEX "folders_tenant_id_idx" ON "folders"("tenant_id");
CREATE INDEX "notes_tenant_id_idx" ON "notes"("tenant_id");
CREATE INDEX "relations_tenant_id_idx" ON "relations"("tenant_id");
