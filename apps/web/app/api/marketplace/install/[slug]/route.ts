import { NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff";

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await bffFetch(`/v1/marketplace/install/${slug}`, { method: "POST" });
  if (!res.ok) return NextResponse.redirect(new URL("/marketplace?error=1", _req.url));
  return NextResponse.redirect(new URL("/marketplace?installed=1", _req.url));
}
