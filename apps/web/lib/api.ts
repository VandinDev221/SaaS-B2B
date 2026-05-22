import { getApiBaseUrl } from "./env";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
  }
}

async function getAccessToken(): Promise<string | undefined> {
  if (typeof window === "undefined") {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    return jar.get("flowos_access")?.value;
  }
  return undefined;
}

async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const token = await getAccessToken();

  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store"
  });

  let data: unknown = undefined;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) throw new ApiError(`API ${method} ${path} falhou`, res.status, data);
  return data as T;
}

export function apiGet<T>(path: string) {
  return apiRequest<T>("GET", path);
}

export function apiPost<T>(path: string, body: unknown) {
  return apiRequest<T>("POST", path, body);
}

export function apiPatch<T>(path: string, body: unknown) {
  return apiRequest<T>("PATCH", path, body);
}
