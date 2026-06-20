import Link from "next/link";
import { apiGet, ApiError } from "@/lib/api";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Kpis = {
  leads: number;
  won: number;
  lost: number;
  openQuotes: number;
  revenue: number;
  pendingPayments: number;
  openIncidents: number;
  conversations: number;
  staleLeads: number;
  conversionRate: number;
  channels: { source: string; count: number }[];
  pipeline: { stage: string; label: string; count: number }[];
};

export default async function DashboardPage() {
  let data: Kpis | null = null;
  let err: ApiError | null = null;

  try {
    data = await apiGet<Kpis>("/v1/dashboard/kpis");
  } catch (e) {
    err = e as ApiError;
  }

  const cards = [
    { label: "Leads", value: data?.leads, hint: "total no pipeline" },
    { label: "Conversao", value: data ? `${data.conversionRate}%` : undefined, hint: "ganhos / leads" },
    { label: "Receita", value: data ? `R$ ${Number(data.revenue).toFixed(2)}` : undefined, hint: "pagamentos confirmados" },
    { label: "Orcamentos abertos", value: data?.openQuotes, hint: "em negociacao" },
    { label: "Conversas", value: data?.conversations, hint: "WhatsApp Hub" },
    { label: "Follow-up pendente", value: data?.staleLeads, hint: ">24h sem resposta" },
    { label: "Cobrancas pendentes", value: data?.pendingPayments, hint: "PIX / links" },
    { label: "Alertas abertos", value: data?.openIncidents, hint: "operacao" }
  ];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/10 via-card to-accent/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
          <div>
            <p className="font-display font-semibold">Primeiros passos</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure nicho, WhatsApp e automacoes em 15 minutos.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/onboarding">Iniciar onboarding</Link>
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">Visao geral</h2>
        <p className="mt-1 text-sm text-muted-foreground">KPIs operacionais do seu tenant.</p>
        {err ? (
          <p className="mt-2 text-sm text-amber-600">
            {err.status === 401
              ? "Sessao expirada. Faca login novamente em /login."
              : `API indisponivel (status ${err.status}).`}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <Card key={item.label} className="group overflow-hidden transition hover:border-primary/30">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
              <p className="mt-2 font-display text-3xl font-bold tracking-tight">{item.value ?? "—"}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data ? (
        <DashboardCharts channels={data.channels ?? []} pipeline={data.pipeline ?? []} />
      ) : null}
    </div>
  );
}
