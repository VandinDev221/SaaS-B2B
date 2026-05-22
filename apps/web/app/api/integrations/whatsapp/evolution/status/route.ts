import { NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff";

export async function GET() {
  try {
    const res = await bffFetch("/v1/integrations/whatsapp/evolution/status");
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      {
        configured: false,
        connectionState: "offline",
        error: "API offline. Reinicie com npm run dev na raiz (porta 4000)."
      },
      { status: 503 }
    );
  }
}
