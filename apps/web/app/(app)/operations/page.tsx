import { apiGet, ApiError } from "@/lib/api";
import { OperationsPanel } from "@/components/operations/operations-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Summary = {
  automations: number;
  runsToday: number;
  openIncidents: number;
  pendingNotifications: number;
  inboxBacklog: number;
  health: string;
};

type Preview = {
  scanned: number;
  eligible: number;
  leads: { id: string; name: string; stage: string; eligible: boolean }[];
};

type Run = {
  id: string;
  status: string;
  trigger: string;
  startedAt: string;
  finishedAt?: string | null;
  output?: { skipped?: boolean } | null;
  automation?: { name: string };
};

export default async function OperationsPage() {
  let summary: Summary | null = null;
  let preview: Preview | null = null;
  let runs: Run[] = [];
  let err: ApiError | null = null;

  try {
    const [summaryRes, previewRes, runsRes] = await Promise.all([
      apiGet<Summary>("/v1/operations/summary"),
      apiGet<Preview>("/v1/automation/followup-d1/preview"),
      apiGet<Run[]>("/v1/operations/runs")
    ]);
    summary = summaryRes;
    preview = previewRes;
    runs = runsRes;
  } catch (e) {
    err = e as ApiError;
  }

  const items = [
    { label: "Automacoes ativas", value: summary?.automations },
    { label: "Execucoes hoje", value: summary?.runsToday },
    { label: "Incidentes abertos", value: summary?.openIncidents },
    { label: "Notificacoes pendentes", value: summary?.pendingNotifications },
    { label: "Inbox backlog", value: summary?.inboxBacklog }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Operacao
            {summary?.health ? <Badge variant="success">{summary.health}</Badge> : null}
          </CardTitle>
          {err ? <p className="text-sm text-amber-600">Erro ao carregar (status {err.status}).</p> : null}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <Card key={i.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{i.label}</p>
              <p className="mt-2 text-2xl font-semibold">{i.value ?? "—"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <OperationsPanel initialPreview={preview} runs={runs} />
    </div>
  );
}
