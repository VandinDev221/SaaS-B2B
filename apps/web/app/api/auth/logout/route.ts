import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/env";

export async function POST(req: NextRequest) {
  const refresh = req.cookies.get("flowos_refresh")?.value;
  if (refresh) {
    try {
      await fetch(`${getApiBaseUrl()}/v1/auth/logout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
        cache: "no-store"
      });
    } catch {
      // cookies cleared below regardless
    }
  }

  const out = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
  const clear = { httpOnly: true, path: "/", maxAge: 0, secure };
  out.cookies.set("flowos_access", "", clear);
  out.cookies.set("flowos_refresh", "", clear);
  return out;
}
