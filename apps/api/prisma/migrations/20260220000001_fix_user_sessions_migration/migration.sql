-- Fix migration: resolve failed 20260220000000_add_user_sessions migration
-- This migration drops the failed table and recreates it with correct types

DROP TABLE IF EXISTS "user_sessions" CASCADE;

-- CreateTable user_sessions (corrected)
CREATE TABLE "user_sessions" (
    "id"           TEXT           NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id"      TEXT           NOT NULL,
    "tenant_id"    VARCHAR(64)    NOT NULL,
    "token_hash"   TEXT           NOT NULL,
    "device_info"  JSONB,
    "ip_address"   TEXT,
    "last_used_at" TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at"   TIMESTAMP(3)   NOT NULL,
    "revoked_at"   TIMESTAMP(3),
    "created_at"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3)   NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "user_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE
);

-- Index para lookup rápido por usuário (listar sessões ativas)
CREATE INDEX "idx_user_session_user_id" ON "user_sessions"("user_id");

-- Index para lookup rápido por token hash (validação no refresh)
CREATE INDEX "idx_user_session_token_hash" ON "user_sessions"("token_hash");

-- Index para cleanup job (deletar sessões expiradas)
CREATE INDEX "idx_user_session_expires_at" ON "user_sessions"("expires_at");
