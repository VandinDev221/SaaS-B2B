import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

import { applyAuthCookies, isAccessTokenExpired, refreshAuthTokens } from "./lib/session";



const PROTECTED = [

  "/dashboard",

  "/crm",

  "/inbox",

  "/quotes",

  "/billing",

  "/schedule",

  "/postsale",

  "/marketplace",

  "/operations",

  "/alerts",

  "/settings"

] as const;



export async function middleware(req: NextRequest) {

  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isProtected) return NextResponse.next();



  const access = req.cookies.get("flowos_access")?.value;

  const refresh = req.cookies.get("flowos_refresh")?.value;



  if (!access && !refresh) {

    const url = req.nextUrl.clone();

    url.pathname = "/login";

    url.searchParams.set("next", pathname);

    return NextResponse.redirect(url);

  }



  if (access && !isAccessTokenExpired(access)) {

    return NextResponse.next();

  }



  if (refresh) {

    const tokens = await refreshAuthTokens(refresh);

    if (tokens) {

      const res = NextResponse.next();

      applyAuthCookies(res, tokens);

      return res;

    }

  }



  const login = req.nextUrl.clone();

  login.pathname = "/login";

  login.searchParams.set("next", pathname);

  login.searchParams.set("error", "session");

  const res = NextResponse.redirect(login);

  res.cookies.set("flowos_access", "", { httpOnly: true, path: "/", maxAge: 0 });

  res.cookies.set("flowos_refresh", "", { httpOnly: true, path: "/", maxAge: 0 });

  return res;

}



export const config = {

  matcher: ["/((?!login|api|_next|favicon.ico).*)"]

};

