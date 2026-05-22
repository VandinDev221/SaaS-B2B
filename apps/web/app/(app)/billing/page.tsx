import { apiGet, ApiError } from "@/lib/api";
import { BillingPanel } from "@/components/billing/billing-panel";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BillingPage() {
  type Payment = { id: string; provider: string; amount: number; status: string };
  type Playbook = { name: string; steps: { day: number; channel: string; template: string }[] };

  let payments: Payment[] = [];
  let overdue: Payment[] = [];
  let playbook: Playbook = { name: "", steps: [] };
  let err: ApiError | null = null;

  try {
    [payments, overdue, playbook] = await Promise.all([
      apiGet<Payment[]>("/v1/billing/payments"),
      apiGet<Payment[]>("/v1/billing/overdue"),
      apiGet<Playbook>("/v1/billing/recovery-playbook")
    ]);
  } catch (e) {
    err = e as ApiError;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cobranca</CardTitle>
          <p className="text-sm text-muted-foreground">PIX, links, assinaturas e recuperacao de inadimplencia.</p>
          {err ? <p className="text-sm text-amber-600">Erro ao carregar (status {err.status}).</p> : null}
        </CardHeader>
      </Card>
      <BillingPanel payments={payments} overdue={overdue} playbook={playbook} />
    </div>
  );
}
