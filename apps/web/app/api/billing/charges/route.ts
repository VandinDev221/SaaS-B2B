import { NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff";

export async function POST(req: Request) {
  const body = await req.json();
  const res = await bffFetch("/v1/billing/charges", { method: "POST", body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
