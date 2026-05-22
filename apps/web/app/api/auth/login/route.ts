import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/env";
import { applyAuthCookies } from "@/lib/session";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");
  const nextPath = String(form.get("next") || "/dashboard");

  const base = getApiBaseUrl().replace(/\/$/, "");
  const loginUrl = `${base}/v1/auth/login`;

  let res: Response;
  try {
    res = await fetch(loginUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store"
    });
  } catch {
    const fail = new URL("/login", req.url);
    fail.searchParams.set("error", "api");
    fail.searchParams.set("next", nextPath);
    return NextResponse.redirect(fail);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fail = new URL("/login", req.url);
    fail.searchParams.set("error", "1");
    fail.searchParams.set("next", nextPath);
    return NextResponse.redirect(fail);
  }

  const parsed = data as Partial<{ accessToken: unknown; refreshToken: unknown }>;
  const accessToken = typeof parsed.accessToken === "string" ? parsed.accessToken : "";
  const refreshToken = typeof parsed.refreshToken === "string" ? parsed.refreshToken : "";

  const redirectTo = nextPath.startsWith("/") ? nextPath : "/dashboard";

  const out = NextResponse.redirect(new URL(redirectTo, req.url));
  applyAuthCookies(out, { accessToken, refreshToken });
  return out;
}
