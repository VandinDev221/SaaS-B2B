function requireApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (url) return url.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL obrigatorio em producao");
  }
  return "http://localhost:4000";
}

export function getApiBaseUrl(): string {
  return requireApiUrl();
}

export function isSecureCookies(): boolean {
  return process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
}
