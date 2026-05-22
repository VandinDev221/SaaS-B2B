import Link from "next/link";
import { apiGet, ApiError } from "@/lib/api";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium">Primeiros passos</p>
            <p className="text-sm text-muted-foreground">
              Configure nicho, WhatsApp e automacoes em 15 minutos.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/onboarding">Iniciar onboarding</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <p className="text-sm text-muted-foreground">KPIs operacionais do seu tenant.</p>
          {err ? (
            <p className="text-sm text-amber-600">
              {err.status === 401
                ? "Sessao expirada. Faca login novamente em /login."
                : `API indisponivel (status ${err.status}). Veja docs/DEMO.md`}
            </p>
          ) : null}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value ?? "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
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
