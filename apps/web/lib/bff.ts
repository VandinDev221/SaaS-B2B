import { cookies } from "next/headers";
import { getApiBaseUrl } from "./env";

export async function bffFetch(path: string, init?: RequestInit) {
  const jar = await cookies();
  const token = jar.get("flowos_access")?.value;
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
