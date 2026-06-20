"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LeadEditor } from "@/components/crm/lead-editor";

type Message = { id: string; body: string; direction: string; createdAt: string };
type InboxFilter = "needs_reply" | "replied" | "all";

type Conversation = {
  id: string;
  channel: string;
  updatedAt: string;
  needsReply?: boolean;
  lastMessageDirection?: string | null;
  lead?: {
    id: string;
    name: string | null;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    stage?: string;
    score?: number;
  };
  messages?: Message[];
};

const POLL_MS = 4000;

type InboxPayload = {
  filter: InboxFilter;
  counts: { needsReply: number; replied: number; total: number };
  items: Conversation[];
};

export function InboxHub({ initial }: { initial: InboxPayload }) {
  const router = useRouter();
  const [filter, setFilter] = useState<InboxFilter>(initial.filter ?? "all");
  const [counts, setCounts] = useState(initial.counts);
  const [conversations, setConversations] = useState(initial.items);
  const [selected, setSelected] = useState(initial.items[0]?.id ?? "");
  const [reply, setReply] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [deletingConv, setDeletingConv] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"list" | "chat" | "ai">("list");
  const [live, setLive] = useState(true);
  const [ai, setAi] = useState<{
    summary?: string;
    draft?: string;
    action?: string;
    quoteMsg?: string;
    provider?: string;
    usedFallback?: boolean;
    loading?: boolean;
  }>({});

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp/conversations?filter=${filter}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as InboxPayload;
      setConversations(data.items ?? []);
      if (data.counts) setCounts(data.counts);
      setSelected((current) => {
        const items = data.items ?? [];
        if (current && items.some((c) => c.id === current)) return current;
        return items[0]?.id ?? "";
      });
    } catch {
      // ignore poll errors
    }
  }, [filter]);

  useEffect(() => {
    setFilter(initial.filter ?? "all");
    setCounts(initial.counts);
    setConversations(initial.items);
    setSelected(initial.items[0]?.id ?? "");
  }, [initial]);

  useEffect(() => {
    void refreshConversations();
  }, [filter]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => void refreshConversations(), POLL_MS);
    return () => clearInterval(id);
  }, [live, refreshConversations]);

  const conv = conversations.find((c) => c.id === selected);
  const leadId = conv?.lead?.id;

  async function runAi(action: string) {
    if (!conv) return;
    setAi((s) => ({ ...s, loading: true }));
    const res = await fetch(`/api/ai/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId: conv.id, leadId })
    });
    const data = await res.json();
    const aiMeta = {
      provider: data.provider as string | undefined,
      usedFallback: Boolean(data.usedFallback)
    };
    if (action === "summary") {
      setAi({ summary: data.summary, ...aiMeta, loading: false });
    }
    if (action === "draft-reply") {
      setAi((s) => ({
        ...s,
        draft: data.draft,
        ...aiMeta,
        loading: false
      }));
      setReply(data.draft ?? "");
    }
    if (action === "next-action") {
      setAi((s) => ({ ...s, action: data.action, ...aiMeta, loading: false }));
    }
    if (action === "classify") router.refresh();
  }

  async function generateQuote() {
    if (!conv) return;
    setAi((s) => ({ ...s, loading: true, quoteMsg: undefined }));
    try {
      const res = await fetch(`/api/quotes/from-conversation/${conv.id}`, { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        number?: string;
        total?: number;
        pdfSent?: boolean;
        message?: string;
        skipped?: string;
        replySent?: boolean;
      };
      if (!res.ok || !data.ok) {
        if (data.skipped === "awaiting_client_info" && data.replySent) {
          setAi((s) => ({
            ...s,
            loading: false,
            quoteMsg:
              data.message ??
              "Pedido ainda incompleto — enviamos perguntas ao cliente no WhatsApp antes do orcamento."
          }));
          await refreshConversations();
          return;
        }
        throw new Error(data.message ?? data.skipped ?? "Nao foi possivel gerar orcamento");
      }
      setAi((s) => ({
        ...s,
        loading: false,
        quoteMsg: data.pdfSent
          ? `Orcamento ${data.number} gerado e PDF enviado no WhatsApp (R$ ${Number(data.total).toFixed(2)}).`
          : `Orcamento ${data.number} criado (R$ ${Number(data.total).toFixed(2)}).`
      }));
      await refreshConversations();
    } catch (e) {
      setAi((s) => ({
        ...s,
        loading: false,
        quoteMsg: e instanceof Error ? e.message : "Erro ao gerar orcamento"
      }));
    }
  }

  async function deleteConversation() {
    if (!conv) return;
    if (
      !confirm(
        "Excluir esta conversa e todas as mensagens? O lead continua no CRM — use Excluir lead para remover tudo."
      )
    ) {
      return;
    }
    setDeletingConv(true);
    try {
      const res = await fetch(`/api/whatsapp/conversations/${conv.id}`, { method: "DELETE" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? `Erro ${res.status}`);
      setSelected("");
      await refreshConversations();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Falha ao excluir conversa");
    } finally {
      setDeletingConv(false);
    }
  }

  async function sendReply() {
    if (!conv || !reply.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/whatsapp/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: reply })
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
      if (!res.ok) {
        const apiMsg = Array.isArray(data.message) ? data.message.join(", ") : data.message;
        const hint =
          typeof apiMsg === "string" && /desconectado|Connection Closed/i.test(apiMsg)
            ? " Abra Configuracoes → WhatsApp e reconecte com QR Code."
            : "";
        throw new Error(`${apiMsg ?? `Erro ao enviar (${res.status})`}${hint}`);
      }
      setReply("");
      await refreshConversations();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Falha ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Atualizacao automatica a cada {POLL_MS / 1000}s {live ? "(ativa)" : "(pausada)"}
        </span>
        <Button type="button" size="sm" variant="ghost" onClick={() => setLive((v) => !v)}>
          {live ? "Pausar" : "Retomar"}
        </Button>
      </div>

      {/* Mobile tabs */}
      <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 lg:hidden">
        {(
          [
            ["list", "Conversas"],
            ["chat", "Chat"],
            ["ai", "IA"]
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMobilePanel(key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
              mobilePanel === key ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_300px]">
        <Card
          className={`h-[min(70vh,560px)] overflow-hidden lg:block ${mobilePanel === "list" ? "block" : "hidden"}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conversas</CardTitle>
            <div className="mt-2 flex flex-wrap gap-1">
              {(
                [
                  ["needs_reply", `Aguardando (${counts.needsReply})`],
                  ["replied", `Respondidos (${counts.replied})`],
                  ["all", `Todos (${counts.total})`]
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={filter === key ? "default" : "outline"}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">
                {filter === "needs_reply"
                  ? "Nenhuma conversa aguardando resposta. Veja a aba Todos ou confira webhook em Configuracoes → WhatsApp."
                  : "Nenhuma conversa nesta aba."}
              </p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelected(c.id);
                    setMobilePanel("chat");
                  }}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    selected === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {c.needsReply ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Aguardando resposta" />
                    ) : null}
                    {c.lead?.name ?? "Lead"}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.messages?.[0]?.body?.slice(0, 40) ?? "Sem mensagens"}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card
          className={`flex h-[min(70vh,560px)] flex-col lg:flex ${mobilePanel === "chat" ? "flex" : "hidden"}`}
        >
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm">{conv?.lead?.name ?? "Selecione uma conversa"}</CardTitle>
              {conv ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-red-600"
                  disabled={deletingConv}
                  onClick={() => void deleteConversation()}
                >
                  {deletingConv ? "..." : "Excluir conversa"}
                </Button>
              ) : null}
            </div>
            {conv?.lead ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{conv.lead.stage}</Badge>
                  <Badge>score {conv.lead.score}</Badge>
                  {conv.lead.phone ? (
                    <span className="text-xs text-muted-foreground">{conv.lead.phone}</span>
                  ) : null}
                </div>
                <LeadEditor
                  lead={{
                    id: conv.lead.id,
                    name: conv.lead.name,
                    phone: conv.lead.phone,
                    email: conv.lead.email,
                    notes: conv.lead.notes,
                    score: conv.lead.score
                  }}
                  onSaved={() => void refreshConversations()}
                  onDeleted={() => {
                    setSelected("");
                    void refreshConversations();
                  }}
                />
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="flex-1 space-y-2 overflow-y-auto p-4">
            {(conv?.messages ?? [])
              .slice()
              .reverse()
              .map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.direction === "inbound" ? "bg-muted" : "ml-auto bg-primary/10 text-primary"
                  }`}
                >
                  {m.body}
                </div>
              ))}
          </CardContent>
          <div className="space-y-2 border-t border-border p-3">
            {sendError ? <p className="text-xs text-red-600">{sendError}</p> : null}
            <div className="flex gap-2">
              <Input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Sua resposta..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendReply();
                  }
                }}
              />
              <Button onClick={() => void sendReply()} disabled={sending || !reply.trim()}>
                {sending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className={`h-[min(70vh,560px)] lg:block ${mobilePanel === "ai" ? "block" : "hidden"}`}>
          <CardHeader>
            <CardTitle className="text-sm">IA Comercial</CardTitle>
            <p className="text-xs text-muted-foreground">Resumo, classificacao e sugestoes</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button size="sm" variant="outline" className="w-full" disabled={ai.loading} onClick={() => runAi("summary")}>
              Resumir conversa
            </Button>
            <Button size="sm" variant="outline" className="w-full" disabled={ai.loading} onClick={() => runAi("draft-reply")}>
              Gerar resposta
            </Button>
            {ai.provider ? (
              <p className="text-xs text-muted-foreground">
                IA: {ai.provider}
                {ai.usedFallback ? " (resposta padrao — LLM indisponivel)" : ""}
              </p>
            ) : null}
            <Button size="sm" variant="outline" className="w-full" disabled={ai.loading} onClick={() => runAi("next-action")}>
              Proxima acao
            </Button>
            <Button size="sm" variant="outline" className="w-full" disabled={ai.loading} onClick={() => runAi("classify")}>
              Classificar lead
            </Button>
            <Button
              size="sm"
              className="w-full"
              disabled={ai.loading || !conv}
              onClick={() => void generateQuote()}
            >
              Gerar orcamento + enviar PDF
            </Button>
            {ai.quoteMsg ? <p className="rounded-lg bg-primary/5 p-2 text-xs text-primary">{ai.quoteMsg}</p> : null}
            {ai.summary ? (
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-2 text-xs">{ai.summary}</pre>
            ) : null}
            {ai.action ? <p className="rounded-lg bg-primary/5 p-2 text-xs text-primary">{ai.action}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
