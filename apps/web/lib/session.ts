function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  if (typeof atob === "function") {
    return atob(padded);
  }
  return Buffer.from(padded, "base64").toString("utf8");
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = base64UrlDecode(part);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") return true;
  return exp * 1000 <= Date.now() + skewSeconds * 1000;
}

export type AuthTokens = { accessToken: string; refreshToken: string };

import { getApiBaseUrl, isSecureCookies } from "./env";

export async function refreshAuthTokens(refreshToken: string): Promise<AuthTokens | null> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store"
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<AuthTokens>;
    if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") return null;
    return { accessToken: data.accessToken, refreshToken: data.refreshToken };
  } catch {
    return null;
  }
}

export function applyAuthCookies(
  response: import("next/server").NextResponse,
  tokens: AuthTokens
) {
  const secure = isSecureCookies();
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/"
  };
  response.cookies.set("flowos_access", tokens.accessToken, cookieOpts);
  response.cookies.set("flowos_refresh", tokens.refreshToken, cookieOpts);
}
