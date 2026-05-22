import { NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff";

export async function GET() {
  const res = await bffFetch("/v1/ai/knowledge");
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const res = await bffFetch("/v1/ai/knowledge", {
    method: "PUT",
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
