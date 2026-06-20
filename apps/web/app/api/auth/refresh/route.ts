import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { applyAuthCookies, refreshAuthTokens } from "@/lib/session";

export async function POST() {
  const jar = await cookies();
  const refresh = jar.get("flowos_refresh")?.value;
  if (!refresh) {
    return NextResponse.json({ ok: false, reason: "no_refresh" }, { status: 401 });
  }

  const tokens = await refreshAuthTokens(refresh);
  if (!tokens) {
    return NextResponse.json({ ok: false, reason: "refresh_failed" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  applyAuthCookies(res, tokens);
  return res;
}
