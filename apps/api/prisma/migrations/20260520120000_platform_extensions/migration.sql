-- Tabelas presentes no schema mas ausentes das migrations anteriores

CREATE TABLE IF NOT EXISTS "InboxEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "InboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InboxEvent_tenantId_provider_eventId_key"
  ON "InboxEvent"("tenantId", "provider", "eventId");
CREATE INDEX IF NOT EXISTS "InboxEvent_tenantId_processedAt_idx"
  ON "InboxEvent"("tenantId", "processedAt");

ALTER TABLE "InboxEvent" DROP CONSTRAINT IF EXISTS "InboxEvent_tenantId_fkey";
ALTER TABLE "InboxEvent" ADD CONSTRAINT "InboxEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "OutboxEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aggregate" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OutboxEvent_tenantId_publishedAt_createdAt_idx"
  ON "OutboxEvent"("tenantId", "publishedAt", "createdAt");

ALTER TABLE "OutboxEvent" DROP CONSTRAINT IF EXISTS "OutboxEvent_tenantId_fkey";
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "TenantBranding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "accentColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "customDomain" TEXT,
    "supportEmail" TEXT,
    "isWhiteLabel" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantBranding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantBranding_tenantId_key"
  ON "TenantBranding"("tenantId");

ALTER TABLE "TenantBranding" DROP CONSTRAINT IF EXISTS "TenantBranding_tenantId_fkey";
ALTER TABLE "TenantBranding" ADD CONSTRAINT "TenantBranding_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "TenantAiKnowledge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessDescription" TEXT NOT NULL DEFAULT '',
    "productsAndServices" TEXT NOT NULL DEFAULT '',
    "quoteInstructions" TEXT NOT NULL DEFAULT '',
    "toneOfVoice" TEXT NOT NULL DEFAULT 'profissional e cordial',
    "autoSendQuotePdf" BOOLEAN NOT NULL DEFAULT true,
    "autoCreateQuoteFromChat" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantAiKnowledge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantAiKnowledge_tenantId_key"
  ON "TenantAiKnowledge"("tenantId");

ALTER TABLE "TenantAiKnowledge" DROP CONSTRAINT IF EXISTS "TenantAiKnowledge_tenantId_fkey";
ALTER TABLE "TenantAiKnowledge" ADD CONSTRAINT "TenantAiKnowledge_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "MarketplaceTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "niche" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "installs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceTemplate_slug_key"
  ON "MarketplaceTemplate"("slug");

CREATE TABLE IF NOT EXISTS "MarketplaceInstall" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceInstall_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceInstall_tenantId_templateId_key"
  ON "MarketplaceInstall"("tenantId", "templateId");
CREATE INDEX IF NOT EXISTS "MarketplaceInstall_tenantId_status_idx"
  ON "MarketplaceInstall"("tenantId", "status");

ALTER TABLE "MarketplaceInstall" DROP CONSTRAINT IF EXISTS "MarketplaceInstall_tenantId_fkey";
ALTER TABLE "MarketplaceInstall" ADD CONSTRAINT "MarketplaceInstall_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceInstall" DROP CONSTRAINT IF EXISTS "MarketplaceInstall_templateId_fkey";
ALTER TABLE "MarketplaceInstall" ADD CONSTRAINT "MarketplaceInstall_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "MarketplaceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "Appointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "reminderAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Appointment_tenantId_startsAt_idx"
  ON "Appointment"("tenantId", "startsAt");
CREATE INDEX IF NOT EXISTS "Appointment_tenantId_status_startsAt_idx"
  ON "Appointment"("tenantId", "status", "startsAt");

ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_tenantId_fkey";
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_leadId_fkey";
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "PostSaleCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostSaleCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PostSaleCampaign_tenantId_status_idx"
  ON "PostSaleCampaign"("tenantId", "status");

ALTER TABLE "PostSaleCampaign" DROP CONSTRAINT IF EXISTS "PostSaleCampaign_tenantId_fkey";
ALTER TABLE "PostSaleCampaign" ADD CONSTRAINT "PostSaleCampaign_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "PostSaleRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "result" JSONB,
    CONSTRAINT "PostSaleRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PostSaleRun_tenantId_campaignId_scheduledAt_idx"
  ON "PostSaleRun"("tenantId", "campaignId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "PostSaleRun_tenantId_status_scheduledAt_idx"
  ON "PostSaleRun"("tenantId", "status", "scheduledAt");

ALTER TABLE "PostSaleRun" DROP CONSTRAINT IF EXISTS "PostSaleRun_tenantId_fkey";
ALTER TABLE "PostSaleRun" ADD CONSTRAINT "PostSaleRun_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostSaleRun" DROP CONSTRAINT IF EXISTS "PostSaleRun_campaignId_fkey";
ALTER TABLE "PostSaleRun" ADD CONSTRAINT "PostSaleRun_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "PostSaleCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostSaleRun" DROP CONSTRAINT IF EXISTS "PostSaleRun_leadId_fkey";
ALTER TABLE "PostSaleRun" ADD CONSTRAINT "PostSaleRun_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
