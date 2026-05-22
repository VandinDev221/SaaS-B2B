-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "whatsappInstance" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "niche" TEXT NOT NULL DEFAULT 'services';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AiUsageLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiUsageLog_tenantId_createdAt_idx" ON "AiUsageLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiUsageLog_tenantId_feature_createdAt_idx" ON "AiUsageLog"("tenantId", "feature", "createdAt");

ALTER TABLE "AiUsageLog" DROP CONSTRAINT IF EXISTS "AiUsageLog_tenantId_fkey";
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
