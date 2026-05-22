import { NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff";

export async function POST() {
  try {
    const res = await bffFetch("/v1/integrations/whatsapp/evolution/setup", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { ok: false, message: "API offline. Reinicie com npm run dev na raiz (porta 4000)." },
      { status: 503 }
    );
  }
}
