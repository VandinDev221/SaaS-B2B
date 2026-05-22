"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CsvImport() {
  const router = useRouter();
  const [csv, setCsv] = useState("nome,telefone,email\nJoao Silva,+5511999999999,joao@email.com");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function importCsv() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/crm/leads/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv })
      });
      const data = (await res.json()) as { imported?: number; errors?: string[] };
      if (!res.ok) throw new Error("Falha na importacao");
      setResult(`Importados: ${data.imported ?? 0}${data.errors?.length ? ` | Avisos: ${data.errors.join("; ")}` : ""}`);
      router.refresh();
    } catch {
      setResult("Erro ao importar CSV");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <p className="text-sm font-medium">Importar leads (CSV)</p>
      <p className="text-xs text-muted-foreground">Colunas: nome, telefone, email, notas (separador , ou ;)</p>
      <textarea
        className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />
      <Button size="sm" disabled={busy} onClick={() => void importCsv()}>
        {busy ? "Importando..." : "Importar"}
      </Button>
      {result ? <p className="text-xs text-primary">{result}</p> : null}
    </div>
  );
}
