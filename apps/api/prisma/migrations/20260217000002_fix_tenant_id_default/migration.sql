-- Fix: Add DEFAULT gen_random_uuid() to tenant_id column
-- The original migration was missing the DEFAULT clause, causing
-- "Null constraint violation on the fields: (tenant_id)" when creating tenants
ALTER TABLE "tenants" ALTER COLUMN "tenant_id" SET DEFAULT gen_random_uuid();
