import { NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await bffFetch(`/v1/whatsapp/conversations/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
