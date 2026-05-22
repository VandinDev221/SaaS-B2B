import { NextResponse } from "next/server";
import { bffFetch } from "@/lib/bff";

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const body = await req.json().catch(() => ({}));
  const { conversationId, leadId } = body as { conversationId?: string; leadId?: string };

  const routes: Record<string, string | undefined> = {
    summary: conversationId ? `/v1/ai/conversations/${conversationId}/summary` : undefined,
    "draft-reply": conversationId ? `/v1/ai/conversations/${conversationId}/draft-reply` : undefined,
    classify: leadId ? `/v1/ai/leads/${leadId}/classify` : undefined,
    "next-action": leadId ? `/v1/ai/leads/${leadId}/next-action` : undefined,
    "quote-draft": leadId ? `/v1/ai/quotes/generate/${leadId}` : undefined
  };

  const path = routes[action];
  if (!path) return NextResponse.json({ message: "Acao invalida" }, { status: 400 });

  const res = await bffFetch(path, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
