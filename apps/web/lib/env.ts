function normalizeServiceUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function requireApiUrl(): string {
  const url = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL)?.trim();
  if (url) return normalizeServiceUrl(url);

  if (process.env.NODE_ENV === "production") {
    throw new Error("API_URL ou NEXT_PUBLIC_API_URL obrigatorio em producao");
  }
  return "http://localhost:4000";
}

export function getApiBaseUrl(): string {
  return requireApiUrl();
}

export function isSecureCookies(): boolean {
  return process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
}
