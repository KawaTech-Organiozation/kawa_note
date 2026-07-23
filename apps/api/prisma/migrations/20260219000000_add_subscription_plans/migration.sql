-- CreateTable subscription_plans
-- Catálogo global de planos disponíveis para seleção no onboarding.
-- Dados populados via seed-plans.js (obrigatório no DB-INIT).

CREATE TABLE "subscription_plans" (
    "plan_id"        SERIAL         NOT NULL,
    "plan_name"      VARCHAR(50)    NOT NULL,
    "max_companies"  INTEGER        NOT NULL DEFAULT 1,
    "max_users"      INTEGER        NOT NULL DEFAULT 10,
    "max_customers"  INTEGER        NOT NULL DEFAULT 100,
    "max_storage_gb" INTEGER        NOT NULL DEFAULT 50,
    "price_monthly"  DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    "features"       JSONB          NOT NULL DEFAULT '{}',
    "active"         BOOLEAN        NOT NULL DEFAULT true,
    "created_at"     TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3)   NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("plan_id")
);

-- Unique index on plan_name (catálogo não pode ter nomes duplicados)
CREATE UNIQUE INDEX "subscription_plans_plan_name_key" ON "subscription_plans"("plan_name");

-- Index para filtrar planos ativos (acesso frequente no onboarding)
CREATE INDEX "subscription_plans_active_idx" ON "subscription_plans"("active");
