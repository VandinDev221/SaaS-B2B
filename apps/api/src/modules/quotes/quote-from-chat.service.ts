import { Injectable, Logger } from "@nestjs/common";
import { conversationStateFromDirection } from "../../common/utils/conversation-message-state";
import { resolveOutboundTarget } from "../../common/utils/whatsapp-phone";
import { AiKnowledgeService } from "../ai/ai-knowledge.service";
import { AiService } from "../ai/ai.service";
import { WhatsappAdapterService } from "../integrations/whatsapp-adapter.service";
import { PrismaService } from "../../prisma/prisma.service";
import { QuotesService } from "./quotes.service";

const QUOTE_INTENT =
  /\b(or[cç]amento|orcamento|cota[cç][aã]o|preciso de|quero|valor|quanto custa|pre[cç]o|proposta|instala[cç][aã]o|cftv|c[aâ]mera)\b/i;

@Injectable()
export class QuoteFromChatService {
  private readonly logger = new Logger(QuoteFromChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly knowledge: AiKnowledgeService,
    private readonly quotes: QuotesService,
    private readonly whatsapp: WhatsappAdapterService
  ) {}

  looksLikeQuoteRequest(text: string): boolean {
    return QUOTE_INTENT.test(text);
  }

  private async sendConversationReply(
    tenantId: string,
    conversationId: string,
    leadId: string,
    body: string
  ) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: { lead: true }
    });
    if (!conv) return;

    const to = resolveOutboundTarget({
      externalRef: conv.externalRef,
      leadPhone: conv.lead.phone
    });
    if (!to) {
      this.logger.warn(`Sem telefone para responder conversa ${conversationId}`);
      return;
    }

    await this.whatsapp.sendTemplateMessage({
      tenantId,
      to,
      templateName: "free_text",
      body
    });

    const now = new Date();
    await this.prisma.message.create({
      data: {
        tenantId,
        conversationId,
        direction: "outbound",
        body,
        metadata: { source: "ai_pre_quote_reply" }
      }
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: now,
        updatedAt: now,
        ...conversationStateFromDirection("outbound")
      }
    });
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { lastInteractionAt: now }
    });
  }

  async createFromConversation(
    tenantId: string,
    conversationId: string,
    opts?: { force?: boolean }
  ) {
    const knowledge = await this.knowledge.get(tenantId);
    if (!knowledge.autoCreateQuoteFromChat && !opts?.force) {
      return { ok: false, skipped: "auto_create_disabled" as const };
    }

    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: { lead: { include: { company: true } } }
    });
    if (!conv) return { ok: false, skipped: "conversation_not_found" as const };

    const assessment = await this.ai.assessQuoteFromConversation(tenantId, conversationId);

    if (!assessment.ready) {
      const reply =
        assessment.replyBeforeQuote?.trim() ||
        `Ola ${conv.lead.name.split(" ")[0]}! Para preparar seu orcamento, pode me confirmar os detalhes do que voce precisa?`;

      await this.sendConversationReply(tenantId, conversationId, conv.leadId, reply);

      return {
        ok: false,
        skipped: "awaiting_client_info" as const,
        replySent: true,
        message: reply,
        missingInfo: assessment.missingInfo,
        clientRequestSummary: assessment.clientRequestSummary
      };
    }

    if (!assessment.items?.length) {
      return { ok: false, skipped: "no_items" as const, note: assessment.note };
    }

    const quote = await this.quotes.create(tenantId, {
      leadId: conv.leadId,
      items: assessment.items,
      discount: assessment.discount ?? 0
    });

    this.logger.log(
      `Orcamento ${quote.number} gerado apos analise da conversa ${conversationId}`
    );

    return {
      ok: true,
      quoteId: quote.id,
      number: quote.number,
      total: quote.total,
      pdfSent: knowledge.autoSendQuotePdf,
      note: assessment.note,
      clientRequestSummary: assessment.clientRequestSummary
    };
  }

  async tryAutoFromInbound(
    tenantId: string,
    conversationId: string,
    leadId: string,
    text: string
  ) {
    const knowledge = await this.knowledge.get(tenantId);
    if (!knowledge.autoCreateQuoteFromChat) return { ok: false, skipped: "disabled" };

    if (!this.looksLikeQuoteRequest(text)) {
      return { ok: false, skipped: "no_intent" };
    }

    const recent = await this.prisma.quote.findFirst({
      where: {
        tenantId,
        leadId,
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      }
    });
    if (recent) return { ok: false, skipped: "recent_quote_exists", quoteId: recent.id };

    return this.createFromConversation(tenantId, conversationId);
  }
}
