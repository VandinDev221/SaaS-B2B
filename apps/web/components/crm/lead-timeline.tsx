"use client";

import { useEffect, useState } from "react";

type HistoryItem = {
  id: string;
  kind: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export function LeadTimeline({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/crm/leads/${leadId}/timeline`);
      if (res.ok) setItems((await res.json()) as HistoryItem[]);
      setLoading(false);
    })();
  }, [leadId]);

  if (loading) return <p className="text-xs text-muted-foreground">Carregando timeline...</p>;
  if (!items.length) return <p className="text-xs text-muted-foreground">Sem historico ainda.</p>;

  return (
    <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
      {items.map((h) => (
        <li key={h.id} className="rounded-lg border border-border bg-muted/30 px-2 py-1.5">
          <span className="font-medium">{h.kind}</span>
          <span className="ml-2 text-muted-foreground">
            {new Date(h.createdAt).toLocaleString("pt-BR")}
          </span>
        </li>
      ))}
    </ul>
  );
}
