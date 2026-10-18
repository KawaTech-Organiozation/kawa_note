CREATE TABLE "vault_shares" (
  "id" TEXT NOT NULL,
  "owner_user_id" TEXT NOT NULL,
  "tenant_id" VARCHAR(64) NOT NULL,
  "folder_name_snapshot" VARCHAR(255) NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "iv" VARCHAR(128) NOT NULL,
  "token_hash" VARCHAR(128) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "max_views" INTEGER NOT NULL DEFAULT 1,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "last_accessed_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vault_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vault_shares_token_hash_key" ON "vault_shares"("token_hash");
CREATE INDEX "vault_shares_tenant_id_owner_user_id_revoked_at_idx" ON "vault_shares"("tenant_id", "owner_user_id", "revoked_at");
CREATE INDEX "vault_shares_expires_at_idx" ON "vault_shares"("expires_at");

ALTER TABLE "vault_shares" ADD CONSTRAINT "vault_shares_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vault_shares" ADD CONSTRAINT "vault_shares_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;
