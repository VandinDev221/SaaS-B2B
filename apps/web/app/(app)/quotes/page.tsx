import { apiGet, ApiError } from "@/lib/api";
import { QuotesPanel } from "@/components/quotes/quotes-panel";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default async function QuotesPage() {
  type Quote = { id: string; number: string; status: string; total: number; lead?: { id: string; name: string } };

  let quotes: Quote[] = [];
  let leads: { id: string; name: string }[] = [];
  let err: ApiError | null = null;

  try {
    [quotes, leads] = await Promise.all([
      apiGet<Quote[]>("/v1/quotes"),
      apiGet<{ id: string; name: string }[]>("/v1/crm/leads")
    ]);
  } catch (e) {
    err = e as ApiError;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Orcamentos</CardTitle>
          <p className="text-sm text-muted-foreground">Geracao com IA, PDF profissional e aprovacao digital.</p>
          {err ? <p className="text-sm text-amber-600">Erro ao carregar (status {err.status}).</p> : null}
        </CardHeader>
      </Card>
      <QuotesPanel quotes={quotes} leads={leads} />
    </div>
  );
}
