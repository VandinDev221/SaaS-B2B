import { NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const res = await bffFetch(`/v1/whatsapp/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao enviar mensagem";
    return NextResponse.json({ message }, { status: 503 });
  }
}
