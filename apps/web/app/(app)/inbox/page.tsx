import { apiGet, ApiError } from "@/lib/api";
import { InboxHub } from "@/components/inbox/inbox-hub";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

type InboxFilter = "needs_reply" | "replied" | "all";

type InboxPayload = {
  filter: InboxFilter;
  counts: { needsReply: number; replied: number; total: number };
  items: {
    id: string;
    channel: string;
    updatedAt: string;
    needsReply?: boolean;
    lead?: { id: string; name: string | null; stage?: string; score?: number };
    messages?: { id: string; body: string; direction: string; createdAt: string }[];
  }[];
};

export default async function InboxPage() {
  let inbox: InboxPayload = {
    filter: "all",
    counts: { needsReply: 0, replied: 0, total: 0 },
    items: []
  };
  let aiStatus: { enabled: boolean; model: string; provider?: string } | null = null;
  let err: ApiError | null = null;

  try {
    [inbox, aiStatus] = await Promise.all([
      apiGet<InboxPayload>("/v1/whatsapp/conversations?filter=all"),
      apiGet<{ enabled: boolean; model: string; provider?: string }>("/v1/ai/status")
    ]);
  } catch (e) {
    err = e as ApiError;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Hub</CardTitle>
          <p className="text-sm text-muted-foreground">
            Inbox + IA{" "}
            {aiStatus?.enabled
              ? `(${aiStatus.provider} · ${aiStatus.model})`
              : "(modo heuristico — instale Ollama e AI_PROVIDER=ollama em apps/api/.env)"}
          </p>
          {err ? <p className="text-sm text-amber-600">Erro ao carregar (status {err.status}).</p> : null}
        </CardHeader>
      </Card>
      {err ? null : <InboxHub initial={inbox} />}
      {!err && inbox.counts.total === 0 ? (
        <p className="text-sm text-muted-foreground">Sem conversas. Execute o seed ou conecte o WhatsApp em Configuracoes.</p>
      ) : null}
    </div>
  );
}
