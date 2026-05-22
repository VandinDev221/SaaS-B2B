import { bffFetch } from "@/lib/bff";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await bffFetch(`/v1/quotes/${id}/pdf`, { method: "GET" });
  if (!res.ok) {
    return new Response("PDF nao encontrado", { status: res.status });
  }
  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename=quote-${id}.pdf`
    }
  });
}
