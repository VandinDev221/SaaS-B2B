ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "lastMessageDirection" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "needsReply" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "Conversation_tenantId_needsReply_lastMessageAt_idx"
  ON "Conversation"("tenantId", "needsReply", "lastMessageAt");

CREATE TABLE IF NOT EXISTS "TenantAutomationSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "automationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "followupD1Enabled" BOOLEAN NOT NULL DEFAULT true,
    "followupD1ScheduleOnInbound" BOOLEAN NOT NULL DEFAULT false,
    "followupD1ScanEnabled" BOOLEAN NOT NULL DEFAULT false,
    "followupD7Enabled" BOOLEAN NOT NULL DEFAULT false,
    "billingRecoveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "postSaleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantAutomationSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantAutomationSettings_tenantId_key"
  ON "TenantAutomationSettings"("tenantId");

ALTER TABLE "TenantAutomationSettings" DROP CONSTRAINT IF EXISTS "TenantAutomationSettings_tenantId_fkey";
ALTER TABLE "TenantAutomationSettings" ADD CONSTRAINT "TenantAutomationSettings_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
