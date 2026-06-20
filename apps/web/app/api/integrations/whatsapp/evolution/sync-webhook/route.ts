import { NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff";

export async function POST() {
  try {
    const res = await bffFetch("/v1/integrations/whatsapp/evolution/sync-webhook", {
      method: "POST"
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { ok: false, message: "API offline. Verifique se flowos-api esta no ar." },
      { status: 503 }
    );
  }
}
