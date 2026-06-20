ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_tenantId_idempotencyKey_key"
  ON "Payment"("tenantId", "idempotencyKey");
