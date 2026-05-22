import { apiGet, ApiError } from "@/lib/api";
import { AiKnowledgePanel } from "@/components/ai/ai-knowledge-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AiStatus = {
  enabled: boolean;
  provider: string;
  model: string | null;
  fallback: string;
};

export default async function AiPage() {
  let status: AiStatus | null = null;
  let err: ApiError | null = null;
  try {
    status = await apiGet<AiStatus>("/v1/ai/status");
  } catch (e) {
    err = e as ApiError;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>IA Comercial</CardTitle>
          <p className="text-sm text-muted-foreground">
            Alimente a IA com dados do seu negocio para orcamentos, respostas e envio de PDF no WhatsApp.
          </p>
          {err ? <p className="text-sm text-amber-600">Erro {err.status}</p> : null}
        </CardHeader>
        <CardContent className="text-sm">
          {status ? (
            <p>
              Provedor: <strong>{status.provider}</strong>
              {status.model ? ` · ${status.model}` : ""}
              {!status.enabled ? ` (modo ${status.fallback})` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>
      <AiKnowledgePanel />
    </div>
  );
}
