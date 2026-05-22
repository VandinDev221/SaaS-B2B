import { apiGet, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Template = { id: string; slug: string; name: string; niche: string; kind: string; price: number; installs: number };

export default async function MarketplacePage() {
  let templates: Template[] = [];
  let err: ApiError | null = null;
  try {
    templates = await apiGet<Template[]>("/v1/marketplace/templates");
  } catch (e) {
    err = e as ApiError;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Marketplace</CardTitle>
          <p className="text-sm text-muted-foreground">Templates por nicho.</p>
          {err ? <p className="text-sm text-amber-600">Erro {err.status}</p> : null}
        </CardHeader>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <p className="font-medium">{t.name}</p>
              <Badge className="mt-2" variant="secondary">{t.niche}</Badge>
              <form action={`/api/marketplace/install/${t.slug}`} method="post" className="mt-3">
                <button type="submit" className="text-sm text-primary">Instalar</button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
