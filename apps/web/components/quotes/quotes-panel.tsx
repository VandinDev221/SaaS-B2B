"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Quote = {
  id: string;
  number: string;
  status: string;
  total: string | number;
  lead?: { id: string; name: string };
};

export function QuotesPanel({ quotes, leads }: { quotes: Quote[]; leads: { id: string; name: string }[] }) {
  const router = useRouter();
  const [leadId, setLeadId] = useState(leads[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function generateFromAi() {
    if (!leadId) return;
    setBusy(true);
    const draftRes = await fetch("/api/ai/quote-draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadId })
    });
    const draft = await draftRes.json();
    await fetch("/api/quotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        leadId,
        items: draft.items,
        discount: draft.discount ?? 0
      })
    });
    setBusy(false);
    router.refresh();
  }

  async function approve(id: string) {
    await fetch(`/api/quotes/${id}/approve`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Lead</label>
            <select
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <Button disabled={busy} onClick={generateFromAi}>
            Gerar orcamento com IA
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {quotes.map((q) => (
          <Card key={q.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{q.number}</p>
                <p className="text-sm text-muted-foreground">{q.lead?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={q.status === "approved" ? "success" : "secondary"}>{q.status}</Badge>
                <span className="font-semibold">R$ {Number(q.total).toFixed(2)}</span>
                <Button size="sm" variant="outline" asChild>
                  <a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noreferrer">
                    PDF
                  </a>
                </Button>
                {q.status !== "approved" ? (
                  <Button size="sm" onClick={() => approve(q.id)}>
                    Aprovar
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
