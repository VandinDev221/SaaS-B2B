"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type IncidentRow = {
  id: string;
  title: string;
  status: string;
  severity: string;
  createdAt: string;
};

export function AlertsIncidentsPanel({ initial }: { initial: IncidentRow[] }) {
  const router = useRouter();
  const [incidents, setIncidents] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function runAction(id: string, action: "ack" | "resolve") {
    setBusy(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/operations/alerts/incidents/${id}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const updated = (await res.json()) as { status?: string };
      const nextStatus = updated.status ?? (action === "ack" ? "acknowledged" : "resolved");
      setIncidents((list) =>
        list.map((i) => (i.id === id ? { ...i, status: nextStatus } : i))
      );
      setMsg(action === "ack" ? "Incidente reconhecido." : "Incidente resolvido.");
      router.refresh();
    } catch {
      setMsg("Falha ao atualizar incidente.");
    } finally {
      setBusy(null);
    }
  }

  if (incidents.length === 0) {
    return <div className="px-5 py-6 text-sm text-muted-foreground">Sem incidentes abertos.</div>;
  }

  return (
    <div>
      {msg ? <p className="border-b border-border px-5 py-2 text-xs text-primary">{msg}</p> : null}
      <div className="divide-y divide-border">
        {incidents.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{i.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{i.severity}</Badge>
                <span>{i.status}</span>
                <span>{new Date(i.createdAt).toLocaleString("pt-BR")}</span>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              {i.status === "open" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy === i.id}
                  onClick={() => void runAction(i.id, "ack")}
                >
                  {busy === i.id ? "..." : "Ack"}
                </Button>
              ) : null}
              {i.status !== "resolved" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy === i.id}
                  onClick={() => void runAction(i.id, "resolve")}
                >
                  Resolver
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
