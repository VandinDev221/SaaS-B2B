"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PreviewLead = {
  id: string;
  name: string;
  stage: string;
  eligible: boolean;
};

type Preview = {
  scanned: number;
  eligible: number;
  leads: PreviewLead[];
};

type Run = {
  id: string;
  status: string;
  trigger: string;
  startedAt: string;
  finishedAt?: string | null;
  output?: { skipped?: boolean; leadId?: string } | null;
  automation?: { name: string };
};

export function OperationsPanel({
  initialPreview,
  runs
}: {
  initialPreview: Preview | null;
  runs: Run[];
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(initialPreview);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshPreview() {
    setBusy("preview");
    setMessage(null);
    try {
      const res = await fetch("/api/automation/followup-d1/preview");
      const data = await res.json();
      if (!res.ok) throw new Error((data as { message?: string }).message ?? "Falha no preview");
      setPreview(data as Preview);
      setMessage(`${(data as Preview).eligible} lead(s) elegivel(is)`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao carregar preview");
    } finally {
      setBusy(null);
    }
  }

  async function runScan() {
    setBusy("scan");
    setMessage(null);
    try {
      const res = await fetch("/api/automation/followup-d1/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error("Falha ao executar scan");
      const p = (data as { preview?: Preview }).preview;
      if (p) setPreview(p);
      setMessage(`Scan enfileirado (job ${(data as { jobId?: string }).jobId ?? "—"})`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro no scan");
    } finally {
      setBusy(null);
    }
  }

  async function runLead(leadId: string) {
    setBusy(`run-${leadId}`);
    setMessage(null);
    try {
      const res = await fetch(`/api/automation/followup-d1/leads/${leadId}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error("Falha ao enviar follow-up");
      setMessage(`Follow-up processado (run ${(data as { runId?: string }).runId ?? "—"})`);
      await refreshPreview();
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setBusy(null);
    }
  }

  const hasLeads = (preview?.leads?.length ?? 0) > 0;
  const hasEligible = (preview?.eligible ?? 0) > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Follow-up D+1</CardTitle>
          <p className="text-sm text-muted-foreground">
            Leads sem resposta ha 24h recebem mensagem automatica. Nova interacao reagenda o envio.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void refreshPreview()}>
              {busy === "preview" ? "Carregando..." : "Atualizar preview"}
            </Button>
            <Button type="button" disabled={busy !== null} onClick={() => void runScan()}>
              {busy === "scan" ? "Executando..." : "Executar scan agora"}
            </Button>
          </div>

          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

          {preview ? (
            <p className="text-xs text-muted-foreground">
              {preview.scanned} leads ativos · {preview.eligible} elegiveis
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Lead</th>
                  <th className="px-3 py-2">Estagio</th>
                  <th className="px-3 py-2">Elegivel</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {(preview?.leads ?? []).map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{lead.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{lead.stage}</td>
                    <td className="px-3 py-2">
                      {lead.eligible ? (
                        <Badge variant="success">Sim</Badge>
                      ) : (
                        <Badge variant="secondary">Nao</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {lead.eligible ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy !== null}
                          onClick={() => void runLead(lead.id)}
                        >
                          {busy === `run-${lead.id}` ? "..." : "Enviar agora"}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!hasLeads ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      Nenhum lead ativo. Atualize o preview.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {hasLeads && !hasEligible ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Nenhum elegivel agora — interacao recente ou follow-up ja enviado. Rode npm run db:seed para
              resetar demo ou aguarde 24h.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ultimas execucoes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma execucao registrada.</p>
          ) : (
            runs.map((run) => {
              const skipped =
                run.output && typeof run.output === "object" && run.output.skipped === true;
              return (
                <div
                  key={run.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{run.automation?.name ?? run.trigger}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString("pt-BR")}
                      {skipped ? " · ignorado (duplicado)" : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      run.status === "succeeded"
                        ? "success"
                        : run.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {run.status}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}