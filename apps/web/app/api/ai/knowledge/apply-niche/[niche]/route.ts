import { NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff";

export async function POST(_req: Request, { params }: { params: Promise<{ niche: string }> }) {
  const { niche } = await params;
  const res = await bffFetch(`/v1/ai/knowledge/apply-niche/${niche}`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
