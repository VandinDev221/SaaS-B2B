import { NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await bffFetch(`/v1/operations/alerts/incidents/${id}/ack`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
