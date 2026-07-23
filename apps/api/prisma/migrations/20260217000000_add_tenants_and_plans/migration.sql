-- CreateTable tenants
CREATE TABLE "tenants" (
    "tenant_id" VARCHAR(64) NOT NULL,
    "tenant_type" VARCHAR(10) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "trade_name" VARCHAR(255),
    "document" VARCHAR(20) NOT NULL,
    "fiscal_number" VARCHAR(20),
    "street" VARCHAR(255) NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "complement" VARCHAR(100),
    "district" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "zip_code" VARCHAR(10) NOT NULL,
    "country" VARCHAR(100) NOT NULL DEFAULT 'Brasil',
    "country_iso" VARCHAR(3) NOT NULL DEFAULT 'BRA',
    "phone" TEXT,
    "mobile_phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "responsible_name" TEXT,
    "responsible_position" TEXT,
    "onboarding_status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "onboarding_step" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable tenant_plans
CREATE TABLE "tenant_plans" (
    "id" SERIAL NOT NULL,
    "tenant_id" VARCHAR(64) NOT NULL,
    "plan_name" VARCHAR(50) NOT NULL,
    "max_companies" INTEGER NOT NULL DEFAULT 1,
    "max_users" INTEGER NOT NULL DEFAULT 10,
    "max_customers" INTEGER NOT NULL DEFAULT 100,
    "max_storage_gb" INTEGER NOT NULL DEFAULT 50,
    "price_monthly" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "features" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_plans_pkey" PRIMARY KEY ("id")
);

-- AddColumn tenant_id to users
ALTER TABLE "users" ADD COLUMN "tenant_id" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_document_key" ON "tenants"("document");

-- CreateIndex
CREATE INDEX "tenants_tenant_type_idx" ON "tenants"("tenant_type");

-- CreateIndex
CREATE INDEX "tenants_onboarding_status_idx" ON "tenants"("onboarding_status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_plans_tenant_id_active_key" ON "tenant_plans"("tenant_id", "active");

-- AddForeignKey
ALTER TABLE "tenant_plans" ADD CONSTRAINT "tenant_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE SET NULL ON UPDATE CASCADE;
