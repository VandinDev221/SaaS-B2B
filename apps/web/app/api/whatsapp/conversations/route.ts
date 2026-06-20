import { NextRequest, NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const filter = req.nextUrl.searchParams.get("filter") ?? "all";
    const res = await bffFetch(`/v1/whatsapp/conversations?filter=${encodeURIComponent(filter)}`);
    const data = await res.json().catch(() => ({ items: [], counts: { needsReply: 0, replied: 0, total: 0 } }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { items: [], counts: { needsReply: 0, replied: 0, total: 0 }, filter: "all" },
      { status: 503 }
    );
  }
}
