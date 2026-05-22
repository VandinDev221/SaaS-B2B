import { NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff";

export async function GET() {
  const res = await bffFetch("/v1/automation/followup-d1/preview");
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
