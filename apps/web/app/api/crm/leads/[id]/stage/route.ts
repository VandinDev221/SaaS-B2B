import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiBaseUrl } from "@/lib/env";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jar = await cookies();
  const token = jar.get("flowos_access")?.value;
  if (!token) return NextResponse.json({ message: "Nao autenticado" }, { status: 401 });

  const body = await req.json();
  const base = getApiBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/v1/crm/leads/${id}/stage`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
