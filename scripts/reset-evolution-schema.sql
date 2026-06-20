-- Reset APENAS o schema da Evolution (nao mexe no FLOWOS / schema public)
-- Use quando aparecer: column "instanceId" does not exist (upgrade v2.1.1 -> v2.3.7)

DROP SCHEMA IF EXISTS evolution CASCADE;
CREATE SCHEMA evolution;

-- Depois: Render -> flowos-evolution -> Manual Deploy
-- Em seguida: reconectar WhatsApp (QR) + npm run sync:evolution-webhook
