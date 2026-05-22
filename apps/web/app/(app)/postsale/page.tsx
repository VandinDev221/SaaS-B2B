import { apiGet, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Campaign = { id: string; name: string; type: string; status: string };

export default async function PostSalePage() {
  let campaigns: Campaign[] = [];
  let err: ApiError | null = null;
  try {
    campaigns = await apiGet<Campaign[]>("/v1/postsale/campaigns");
  } catch (e) {
    err = e as ApiError;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pos-venda</CardTitle>
          <p className="text-sm text-muted-foreground">Reativacao, upsell e manutencao.</p>
          {err ? <p className="text-sm text-amber-600">Erro {err.status}</p> : null}
        </CardHeader>
      </Card>
      <div className="space-y-3">
        {campaigns.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.type}</p>
              </div>
              <Badge variant="secondary">{c.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
