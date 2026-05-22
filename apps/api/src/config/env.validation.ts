const WEAK_SECRETS = new Set([
  "change-me-access",
  "change-me-refresh",
  "change-me-webhook",
  "dev-webhook-secret",
  "flowos-webhook-secret",
  "sua-chave-secreta-aqui"
]);

function isWeakSecret(value: unknown): boolean {
  const s = String(value ?? "").trim();
  if (!s) return true;
  if (WEAK_SECRETS.has(s)) return true;
  if (s.length < 32 && s.startsWith("change-me")) return true;
  return false;
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = String(config.NODE_ENV ?? "development");
  const isProd = nodeEnv === "production";

  const requiredAlways = ["DATABASE_URL", "REDIS_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
  for (const key of requiredAlways) {
    if (!config[key]) {
      throw new Error(`Variavel obrigatoria ausente: ${key}`);
    }
    if (isProd && isWeakSecret(config[key])) {
      throw new Error(`Segredo inseguro em producao: ${key}`);
    }
  }

  if (isProd) {
    const origins = parseOrigins(String(config.CORS_ORIGINS ?? ""));
    if (origins.length === 0) {
      throw new Error("CORS_ORIGINS obrigatorio em producao (ex.: https://app.seudominio.com)");
    }

    if (!config.EVOLUTION_API_URL) {
      throw new Error("EVOLUTION_API_URL obrigatorio em producao");
    }
    if (isWeakSecret(config.EVOLUTION_API_KEY)) {
      throw new Error("EVOLUTION_API_KEY insegura em producao");
    }
    if (isWeakSecret(config.EVOLUTION_WEBHOOK_SECRET)) {
      throw new Error("EVOLUTION_WEBHOOK_SECRET inseguro em producao");
    }

    if (config.ALLOW_WHATSAPP_MOCK === "true") {
      throw new Error("ALLOW_WHATSAPP_MOCK nao pode ser true em producao");
    }
    if (config.ALLOW_PIX_MOCK === "true") {
      throw new Error("ALLOW_PIX_MOCK nao pode ser true em producao");
    }

    if (!config.PUBLIC_WEB_URL || String(config.PUBLIC_WEB_URL).includes("localhost")) {
      throw new Error("PUBLIC_WEB_URL deve apontar para o dominio publico em producao");
    }
  }

  return config;
}

export function getCorsOrigins(config: Record<string, unknown>): string[] | boolean {
  const parsed = parseOrigins(String(config.CORS_ORIGINS ?? ""));
  if (parsed.length > 0) return parsed;
  if (String(config.NODE_ENV) === "production") return [];
  return ["http://localhost:3000", "http://127.0.0.1:3000"];
}

export function isProductionEnv(config: Record<string, unknown>): boolean {
  return String(config.NODE_ENV ?? "development") === "production";
}
