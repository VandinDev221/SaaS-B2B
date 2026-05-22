"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Knowledge = {
  businessDescription: string;
  productsAndServices: string;
  quoteInstructions: string;
  toneOfVoice: string;
  autoSendQuotePdf: boolean;
  autoCreateQuoteFromChat: boolean;
};

export function AiKnowledgePanel() {
  const [data, setData] = useState<Knowledge | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/ai/knowledge");
    setData((await res.json()) as Knowledge);
  }

  useEffect(() => {
    void load();
  }, []);

  async function applyDefaults() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ai/knowledge/apply-defaults", { method: "POST" });
      if (!res.ok) throw new Error("Falha ao carregar modelo");
      await load();
      setMsg("Modelo FLOWOS carregado. Revise e clique em Salvar se ajustar algo.");
    } catch {
      setMsg("Erro ao carregar modelo sugerido.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!data) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ai/knowledge", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      setMsg("Base da IA atualizada.");
    } catch {
      setMsg("Erro ao salvar configuracao.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Conhecimento do negocio</CardTitle>
          <p className="text-sm text-muted-foreground">
            A IA analisa cada conversa, atende o cliente com perguntas se precisar e so entao gera e envia o PDF do
            orcamento.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Descricao da empresa</span>
            <textarea
              className="min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={data.businessDescription}
              onChange={(e) => setData({ ...data, businessDescription: e.target.value })}
              placeholder="Ex.: Instalacao de CFTV, alarmes e monitoramento 24h em Fortaleza..."
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Produtos e servicos (precos, pacotes)</span>
            <textarea
              className="min-h-[100px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={data.productsAndServices}
              onChange={(e) => setData({ ...data, productsAndServices: e.target.value })}
              placeholder="Kit 4 cameras HD R$ 2.490 | Instalacao R$ 350 | Manutencao mensal R$ 89..."
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Regras para montar orcamentos</span>
            <textarea
              className="min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={data.quoteInstructions}
              onChange={(e) => setData({ ...data, quoteInstructions: e.target.value })}
              placeholder="Sempre incluir instalacao. Desconto maximo 10%. Validade 7 dias..."
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Tom de voz</span>
            <Input
              value={data.toneOfVoice}
              onChange={(e) => setData({ ...data, toneOfVoice: e.target.value })}
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automacoes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.autoCreateQuoteFromChat}
              onChange={(e) => setData({ ...data, autoCreateQuoteFromChat: e.target.checked })}
            />
            Gerar orcamento quando o cliente pedir no WhatsApp (orcamento, preco, cotacao...)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.autoSendQuotePdf}
              onChange={(e) => setData({ ...data, autoSendQuotePdf: e.target.checked })}
            />
            Enviar PDF do orcamento no WhatsApp assim que for criado
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void applyDefaults()}>
              Carregar modelo sugerido
            </Button>
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? "Salvando..." : "Salvar base da IA"}
            </Button>
          </div>
          {msg ? <p className="text-muted-foreground">{msg}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
