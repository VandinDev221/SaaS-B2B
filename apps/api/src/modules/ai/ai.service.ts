import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LeadStage } from "@prisma/client";
import { buildConversationTranscript } from "../../common/utils/conversation-transcript";
import {
  buildDraftReplyFallback,
  classifyInboundIntent,
  sanitizeDraftReply
} from "../../common/utils/draft-reply.util";
import { PrismaService } from "../../prisma/prisma.service";
import { getCatalog } from "../quotes/catalog";
import { EntitlementsService } from "../platform/entitlements.service";
import { AiKnowledgeService } from "./ai-knowledge.service";
import { describeAiProvider, resolveLlmConfig } from "./llm-config";

type AiMessage = { role: "system" | "user" | "assistant"; content: string };

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly knowledge: AiKnowledgeService,
    private readonly entitlements: EntitlementsService
  ) {}

  private getLlmConfig() {
    return resolveLlmConfig(this.config);
  }

  private async logUsage(
    tenantId: string,
    feature: string,
    provider: string,
    model: string | null,
    promptChars: number,
    completionChars: number
  ) {
    const promptTokens = Math.ceil(promptChars / 4);
    const completionTokens = Math.ceil(completionChars / 4);
    const estimatedCostUsd =
      provider === "ollama" ? 0 : (promptTokens + completionTokens) * 0.000002;
    await this.prisma.aiUsageLog.create({
      data: {
        tenantId,
        feature,
        provider,
        model,
        promptTokens,
        completionTokens,
        estimatedCostUsd
      }
    });
  }

  private async chat(
    messages: AiMessage[],
    fallback: string,
    usage?: { tenantId: string; feature: string },
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ text: string; provider: string; usedFallback: boolean }> {
    const llm = this.getLlmConfig();
    if (!llm) {
      return { text: fallback, provider: "flowos-heuristic", usedFallback: true };
    }

    if (usage) {
      await this.entitlements.assertAiQuota(usage.tenantId);
    }

    try {
      const res = await fetch(`${llm.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${llm.apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: llm.model,
          messages,
          temperature: options?.temperature ?? 0.4,
          max_tokens: options?.maxTokens ?? 800,
          stream: false
        }),
        signal: AbortSignal.timeout(llm.timeoutMs)
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        // eslint-disable-next-line no-console
        console.warn(`[AI] LLM error ${res.status}: ${errBody.slice(0, 200)}`);
        return { text: fallback, provider: "flowos-heuristic", usedFallback: true };
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = data.choices?.[0]?.message?.content?.trim();
      if (!raw) {
        return { text: fallback, provider: "flowos-heuristic", usedFallback: true };
      }
      if (usage) {
        const promptChars = messages.reduce((n, m) => n + m.content.length, 0);
        await this.logUsage(usage.tenantId, usage.feature, llm.provider, llm.model, promptChars, raw.length);
      }
      return { text: raw, provider: llm.provider, usedFallback: false };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[AI] LLM fetch failed", e);
      return { text: fallback, provider: "flowos-heuristic", usedFallback: true };
    }
  }

  getStatus() {
    const meta = describeAiProvider(this.config);
    return {
      enabled: meta.enabled,
      provider: meta.provider,
      model: meta.model,
      baseUrl: meta.baseUrl,
      fallback: "flowos-heuristic"
    };
  }

  async summarizeConversation(tenantId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: { lead: true, messages: { orderBy: { createdAt: "asc" }, take: 40 } }
    });
    if (!conv) throw new NotFoundException("Conversa nao encontrada");

    const { transcript } = buildConversationTranscript(conv.messages, { limit: 40 });

    const fallback = [
      `Lead: ${conv.lead.name}`,
      `Estagio: ${conv.lead.stage}`,
      `Score: ${conv.lead.score}`,
      `Resumo: ${conv.messages.length} mensagens. Ultima: "${conv.messages.at(-1)?.body?.slice(0, 120) ?? "—"}".`,
      "Sugestao: enviar orcamento e agendar follow-up em 24h."
    ].join("\n");

    const systemContext = await this.knowledge.buildSystemContext(tenantId);
    const { text, provider, usedFallback } = await this.chat(
      [
        {
          role: "system",
          content: `${systemContext}\nResuma em portugues (max 5 bullets): intencao, objecoes, proximo passo.`
        },
        { role: "user", content: transcript || "Sem mensagens ainda." }
      ],
      fallback,
      { tenantId, feature: "ai.summary" }
    );

    await this.prisma.analyticsEvent.create({
      data: {
        tenantId,
        eventName: "ai.conversation.summary",
        eventData: { conversationId, provider, usedFallback }
      }
    });

    return { summary: text, provider, usedFallback, leadId: conv.leadId };
  }

  async classifyLead(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        conversations: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          include: { messages: { orderBy: { createdAt: "asc" }, take: 40 } }
        }
      }
    });
    if (!lead) throw new NotFoundException("Lead nao encontrado");

    const mainConv = lead.conversations[0];
    const { transcript } = mainConv
      ? buildConversationTranscript(mainConv.messages, { limit: 40 })
      : { transcript: "" };
    const msgs = transcript || lead.conversations.flatMap((c) => c.messages.map((m) => m.body)).join(" ");
    const hot = lead.score >= 80 || /urgente|hoje|aprovado|fechar/i.test(msgs);
    const warm = lead.score >= 50 || /orcamento|valor|quando/i.test(msgs);

    const classification = hot ? "quente" : warm ? "morno" : "frio";
    const suggestedStage: LeadStage = hot
      ? "negotiation"
      : warm
        ? "proposal_sent"
        : lead.stage;

    const fallback = `Classificacao: ${classification}. Score sugerido: ${hot ? 90 : warm ? 70 : 35}. Mover para ${suggestedStage}.`;

    const { text, provider, usedFallback } = await this.chat(
      [
        {
          role: "system",
          content: "Classifique o lead (quente/morno/frio) e sugira score 0-100 e estagio CRM. Resposta curta em PT-BR."
        },
        {
          role: "user",
          content: `Lead: ${lead.name}, tags: ${lead.tags.join(",")}, stage: ${lead.stage}, notas: ${lead.notes ?? ""}\n\nConversa:\n${msgs.slice(0, 3000)}`
        }
      ],
      fallback,
      { tenantId, feature: "ai.classify" }
    );

    const newScore = hot ? Math.max(lead.score, 85) : warm ? Math.max(lead.score, 65) : lead.score;

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { score: newScore }
    });

    return { classification, analysis: text, provider, usedFallback, suggestedStage, score: newScore };
  }

  async nextAction(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        conversations: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          include: { messages: { orderBy: { createdAt: "asc" }, take: 40 } }
        }
      }
    });
    if (!lead) throw new NotFoundException("Lead nao encontrado");

    const mainConv = lead.conversations[0];
    const { transcript } = mainConv
      ? buildConversationTranscript(mainConv.messages, {
          limit: 40,
          highlightLastInbound: true
        })
      : { transcript: "" };

    const actions: Record<LeadStage, string> = {
      new: "Qualificar em 15min: perguntar urgencia e enviar catalogo.",
      qualified: "Gerar orcamento PDF e enviar link de aprovacao.",
      proposal_sent: "Follow-up WhatsApp em 24h com beneficio e prazo.",
      negotiation: "Oferecer condicao de pagamento (PIX ou parcelado).",
      won: "Agendar pos-venda e pedir indicacao.",
      lost: "Campanha de reativacao em 14 dias com desconto."
    };

    const fallback = actions[lead.stage] ?? "Revisar historico e definir proxima tarefa.";

    const systemContext = await this.knowledge.buildSystemContext(tenantId);
    const { text, provider, usedFallback } = await this.chat(
      [
        {
          role: "system",
          content: `${systemContext}\nSugira UMA proxima acao comercial objetiva em PT-BR (1-2 frases), com base na conversa.`
        },
        {
          role: "user",
          content: `Lead: ${lead.name}, stage: ${lead.stage}, score: ${lead.score}\n\nConversa:\n${transcript || "Sem mensagens."}`
        }
      ],
      fallback,
      { tenantId, feature: "ai.next_action" }
    );

    return { action: text, provider, usedFallback, priority: lead.score >= 70 ? "alta" : "media" };
  }

  async draftReply(tenantId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: { lead: true, messages: { orderBy: { createdAt: "asc" }, take: 40 } }
    });
    if (!conv) throw new NotFoundException("Conversa nao encontrada");

    const knowledge = await this.knowledge.get(tenantId);
    const { transcript, lastInbound } = buildConversationTranscript(conv.messages, {
      limit: 40,
      highlightLastInbound: true
    });

    const firstName = conv.lead.name?.split(" ")[0] ?? "cliente";
    const lastBody = lastInbound?.body?.trim() ?? null;
    const inboundIntent = lastBody ? classifyInboundIntent(lastBody) : "other";
    const fallback = buildDraftReplyFallback(firstName, lastBody);

    const leadMeta = [
      `Lead: ${conv.lead.name}`,
      conv.lead.tags.length ? `Tags: ${conv.lead.tags.join(", ")}` : "",
      conv.lead.notes ? `Notas: ${conv.lead.notes}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    const systemContext = await this.knowledge.buildSystemContext(tenantId);
    const { text, provider, usedFallback } = await this.chat(
      [
        {
          role: "system",
          content: `${systemContext}

Tarefa: escrever a proxima mensagem do ATENDENTE no WhatsApp para enviar agora.

Regras obrigatorias:
- Responda SOMENTE a ultima mensagem do cliente (bloco marcado no final).
- NUNCA repita ou cite a mensagem do cliente entre aspas (ex.: evite "Sobre 'boa tarde':").
- Se for apenas cumprimento (oi, bom dia, boa tarde): cumprimente de volta e pergunte como pode ajudar. NAO diga "vou verificar" nem "retorno em instantes".
- Se for agradecimento: responda de forma cordial e curta.
- Use o historico apenas para contexto; nao repita perguntas ja respondidas.
- Tom: ${knowledge.toneOfVoice}.
- 1 a 3 frases curtas, portugues BR, sem markdown, sem listas.
- Seja natural, como humano no WhatsApp comercial.

Intent detectado da ultima mensagem: ${inboundIntent}.`
        },
        {
          role: "user",
          content: `${leadMeta}\n\nHistorico da conversa:\n${transcript}`
        }
      ],
      fallback,
      { tenantId, feature: "ai.draft_reply" },
      { maxTokens: 280, temperature: 0.35 }
    );

    const draft = sanitizeDraftReply(
      usedFallback || /Sobre\s+"/i.test(text) ? buildDraftReplyFallback(firstName, lastBody) : text
    );

    return { draft, provider, usedFallback };
  }

  private parseQuoteJson(text: string) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as {
        items?: { name: string; qty: number; unitPrice: number; sku?: string }[];
        discount?: number;
        note?: string;
      };
    } catch {
      return null;
    }
  }

  async assessQuoteFromConversation(tenantId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        lead: { include: { company: true } },
        messages: { orderBy: { createdAt: "asc" }, take: 30 }
      }
    });
    if (!conv) throw new NotFoundException("Conversa nao encontrada");

    const niche = conv.lead.company.industry || conv.lead.tags[0] || "services";
    const catalog = getCatalog(niche);
    const { transcript } = buildConversationTranscript(conv.messages, {
      limit: 30,
      highlightLastInbound: true
    });

    const fallbackItems = catalog.slice(0, 2).map((p) => ({
      sku: p.sku,
      name: p.name,
      qty: 1,
      unitPrice: p.unitPrice
    }));
    const fallback = {
      ready: false,
      replyBeforeQuote: `Ola ${conv.lead.name.split(" ")[0]}! Para montar seu orcamento com precisao, me confirma quantidade e tipo de servico/produto que voce precisa?`,
      missingInfo: ["detalhes do pedido"],
      items: fallbackItems,
      discount: 0,
      note: `Aguardando informacoes do cliente (catalogo ${niche}).`
    };

    const systemContext = await this.knowledge.buildSystemContext(tenantId);
    const { text } = await this.chat(
      [
        {
          role: "system",
          content: `${systemContext}

Analise TODA a conversa abaixo. Decida se ja ha informacao suficiente para um orcamento fechado.

Responda APENAS JSON valido:
{
  "ready": boolean,
  "replyBeforeQuote": "mensagem curta para WhatsApp se ready=false, senao null",
  "missingInfo": ["lista do que falta"],
  "clientRequestSummary": "resumo do pedido em 1 frase",
  "items": [{"name":"string","qty":number,"unitPrice":number}],
  "discount": number,
  "note": "string"
}

Regras:
- ready=true SOMENTE se o pedido estiver claro E voce ja tiver "atendido" o cliente (sem duvidas pendentes).
- Se faltar dado (quantidade, modelo, local, prazo), ready=false e replyBeforeQuote com perguntas objetivas.
- Se ready=true, items devem refletir o combinado na conversa; use catalogo: ${JSON.stringify(catalog.slice(0, 12))}`
        },
        { role: "user", content: transcript || "Cliente iniciou contato." }
      ],
      JSON.stringify(fallback)
    );

    const parsed = this.parseQuoteJson(text) as {
      ready?: boolean;
      replyBeforeQuote?: string | null;
      missingInfo?: string[];
      clientRequestSummary?: string;
      items?: { name: string; qty: number; unitPrice: number }[];
      discount?: number;
      note?: string;
    } | null;

    const items = (parsed?.items ?? (parsed?.ready ? fallback.items : [])).filter(
      (i) => i.name && i.qty > 0 && i.unitPrice >= 0
    );
    const discount = parsed?.discount ?? 0;
    const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const ready = Boolean(parsed?.ready) && items.length > 0;

    return {
      ready,
      replyBeforeQuote: parsed?.replyBeforeQuote ?? fallback.replyBeforeQuote,
      missingInfo: parsed?.missingInfo ?? [],
      clientRequestSummary: parsed?.clientRequestSummary,
      items,
      discount,
      subtotal,
      total: Math.max(0, subtotal - discount),
      note: parsed?.note ?? fallback.note,
      niche
    };
  }

  async generateQuoteDraftFromConversation(tenantId: string, conversationId: string) {
    const assessment = await this.assessQuoteFromConversation(tenantId, conversationId);
    return {
      ready: assessment.ready,
      items: assessment.items,
      discount: assessment.discount,
      subtotal: assessment.subtotal,
      total: assessment.total,
      note: assessment.note,
      niche: assessment.niche,
      replyBeforeQuote: assessment.replyBeforeQuote
    };
  }

  async generateQuoteDraft(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: { company: true }
    });
    if (!lead) throw new NotFoundException("Lead nao encontrado");

    const niche = lead.company.industry || lead.tags[0] || "services";
    const catalog = getCatalog(niche);
    const picked = catalog.slice(0, 2);
    const items = picked.map((p) => ({
      sku: p.sku,
      name: p.name,
      qty: 1,
      unitPrice: p.unitPrice
    }));
    const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

    return {
      niche,
      items,
      subtotal,
      discount: 0,
      total: subtotal,
      note: `Orcamento sugerido para nicho ${niche} com base no catalogo FLOWOS.`
    };
  }

  async getUsageStats(tenantId: string) {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const [count, agg] = await Promise.all([
      this.prisma.aiUsageLog.count({ where: { tenantId, createdAt: { gte: start } } }),
      this.prisma.aiUsageLog.aggregate({
        where: { tenantId, createdAt: { gte: start } },
        _sum: { promptTokens: true, completionTokens: true, estimatedCostUsd: true }
      })
    ]);

    const ent = await this.entitlements.getEffective(tenantId);
    const limit = Number(ent["ai.monthlyCalls"] ?? 200);

    return {
      month: start.toISOString().slice(0, 7),
      calls: count,
      promptTokens: agg._sum.promptTokens ?? 0,
      completionTokens: agg._sum.completionTokens ?? 0,
      estimatedCostUsd: Number(agg._sum.estimatedCostUsd ?? 0),
      quota: { used: count, limit }
    };
  }
}
