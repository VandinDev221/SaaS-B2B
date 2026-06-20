import { cookies } from "next/headers";
import { getApiBaseUrl } from "./env";
import {
  applyAuthCookieStore,
  isAccessTokenExpired,
  refreshAuthTokens
} from "./session";

async function ensureAccessToken(): Promise<string | undefined> {
  const jar = await cookies();
  const access = jar.get("flowos_access")?.value;
  const refresh = jar.get("flowos_refresh")?.value;

  if (access && !isAccessTokenExpired(access)) {
    return access;
  }

  if (refresh) {
    const tokens = await refreshAuthTokens(refresh);
    if (tokens) {
      applyAuthCookieStore(jar, tokens);
      return tokens.accessToken;
    }
  }

  return access;
}

async function apiFetch(path: string, token: string | undefined, init?: RequestInit) {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  return fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
}

export async function bffFetch(path: string, init?: RequestInit) {
  let token = await ensureAccessToken();
  let res = await apiFetch(path, token, init);

  if (res.status === 401) {
    const jar = await cookies();
    const refresh = jar.get("flowos_refresh")?.value;
    if (refresh) {
      const tokens = await refreshAuthTokens(refresh);
      if (tokens) {
        applyAuthCookieStore(jar, tokens);
        res = await apiFetch(path, tokens.accessToken, init);
      }
    }
  }

  return res;
}
