import { apiGet, ApiError } from "@/lib/api";
import { AlertsIncidentsPanel, type IncidentRow } from "@/components/alerts/alerts-incidents-panel";

type Rule = { id: string; name: string; isEnabled: boolean; severity: string; updatedAt: string };

export default async function AlertsPage() {
  let rules: Rule[] = [];
  let incidents: IncidentRow[] = [];
  let err: ApiError | null = null;

  try {
    rules = await apiGet<Rule[]>("/v1/operations/alerts/rules");
    incidents = await apiGet<IncidentRow[]>("/v1/operations/alerts/incidents");
  } catch (e) {
    err = e as ApiError;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-background/70 p-5">
        <h1 className="text-2xl font-semibold">Alertas</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Regras operacionais e incidentes com reconhecimento e resolucao.
        </p>
        {err ? (
          <p className="mt-3 text-sm text-amber-600">
            Nao foi possivel carregar alertas (status {err.status}).
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background/70">
          <div className="border-b border-border px-5 py-3 text-sm font-medium">Regras</div>
          <div className="divide-y divide-border">
            {rules.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">Sem regras.</div>
            ) : (
              rules.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.severity} • {r.isEnabled ? "ativa" : "pausada"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.updatedAt).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/70">
          <div className="border-b border-border px-5 py-3 text-sm font-medium">Incidentes</div>
          <AlertsIncidentsPanel initial={incidents} />
        </div>
      </section>
    </div>
  );
}
