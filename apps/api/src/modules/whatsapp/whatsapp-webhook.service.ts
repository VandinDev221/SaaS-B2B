import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { LeadStage } from "@prisma/client";
import { QuoteFromChatService } from "../quotes/quote-from-chat.service";
import {
  extractEvolutionMessageText,
  isEvolutionFromMe,
  isEvolutionMessageEvent
} from "../../common/utils/extract-evolution-message";
import {
  digitsToWhatsAppJid,
  normalizeBrazilMobile,
  resolveInboundPhone,
  toE164
} from "../../common/utils/whatsapp-phone";
import { conversationStateFromDirection } from "../../common/utils/conversation-message-state";
import { PrismaService } from "../../prisma/prisma.service";
import { FollowupSchedulerService } from "../automation/followup-scheduler.service";

export type EvolutionInboundMessage = {
  remoteJid: string;
  text: string;
  pushName?: string;
};

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly followupScheduler: FollowupSchedulerService,
    @Inject(forwardRef(() => QuoteFromChatService))
    private readonly quoteFromChat: QuoteFromChatService
  ) {}

  extractInboundMessages(body: Record<string, unknown>): EvolutionInboundMessage[] {
    const event = String(body.event ?? "");
    if (!isEvolutionMessageEvent(event)) return [];

    const items = this.collectWebhookItems(body);
    const out: EvolutionInboundMessage[] = [];

    for (const row of items) {
      const key = (row.key ?? body.key) as Record<string, unknown> | undefined;
      if (!key || isEvolutionFromMe(key)) continue;

      const enrichedRow = {
        ...row,
        sender: row.sender ?? body.sender,
        senderPn: row.senderPn ?? key.senderPn
      };

      const phone = resolveInboundPhone(key, enrichedRow);
      if (!phone) {
        this.logger.debug(
          `Webhook: JID sem telefone BR key=${JSON.stringify({
            remoteJid: key.remoteJid,
            remoteJidAlt: key.remoteJidAlt,
            sender: enrichedRow.sender
          })}`
        );
        continue;
      }

      const remoteJid = digitsToWhatsAppJid(phone);
      if (!remoteJid) continue;

      const message = (row.message ?? body.message ?? {}) as Record<string, unknown>;
      const text = extractEvolutionMessageText(message);
      if (!text.trim()) {
        this.logger.debug(`Webhook: mensagem sem texto processavel phone=${phone}`);
        continue;
      }

      out.push({
        remoteJid,
        text: text.trim(),
        pushName: String(row.pushName ?? body.pushName ?? "").trim() || undefined
      });
    }

    return out;
  }

  private collectWebhookItems(body: Record<string, unknown>): Record<string, unknown>[] {
    const root = body.data ?? body;
    if (Array.isArray(root)) {
      return root.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
    }
    if (root && typeof root === "object") {
      const data = root as Record<string, unknown>;
      if (Array.isArray(data.messages)) {
        return data.messages.filter((item) => item && typeof item === "object") as Record<
          string,
          unknown
        >[];
      }
      return [data];
    }
    return [body];
  }

  /** Motivo resumido quando nenhuma mensagem foi extraida (para log/debug). */
  describeSkip(body: Record<string, unknown>): string {
    const event = String(body.event ?? "(vazio)");
    if (!isEvolutionMessageEvent(event)) return `evento_ignorado:${event}`;

    const items = this.collectWebhookItems(body);
    if (items.length === 0) return "data_vazio";

    const row = items[0];
    const key = (row.key ?? body.key) as Record<string, unknown> | undefined;
    if (!key) return "sem_key";
    if (isEvolutionFromMe(key)) return "from_me";
    if (!resolveInboundPhone(key, row)) return "jid_invalido_ou_lid";
    const message = (row.message ?? body.message ?? {}) as Record<string, unknown>;
    if (!extractEvolutionMessageText(message).trim()) return "sem_texto";
    return "desconhecido";
  }

  async findOrCreateLead(tenantId: string, phoneDigits: string, pushName?: string) {
    const normalized = normalizeBrazilMobile(phoneDigits);
    if (!normalized) return null;
    const suffix = normalized.slice(-8);
    const e164 = toE164(normalized);

    const existing = await this.prisma.lead.findFirst({
      where: {
        tenantId,
        OR: [
          { phone: e164 },
          { phone: { endsWith: suffix } },
          { phone: { contains: suffix } }
        ]
      }
    });

    if (existing) {
      if (existing.phone !== e164) {
        await this.prisma.lead.update({
          where: { id: existing.id },
          data: { phone: e164 }
        });
      }
      return { lead: { ...existing, phone: e164 }, created: false };
    }

    const company = await this.prisma.company.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "asc" }
    });
    if (!company) return null;

    const lead = await this.prisma.lead.create({
      data: {
        tenantId,
        companyId: company.id,
        name: pushName || `WhatsApp ${normalized.slice(-4)}`,
        phone: e164,
        source: "whatsapp_inbound",
        stage: LeadStage.new,
        lastInteractionAt: new Date()
      }
    });

    return { lead, created: true };
  }

  async ingestInbound(tenantId: string, inbound: EvolutionInboundMessage) {
    const phone = resolveInboundPhone({ remoteJid: inbound.remoteJid }, {});
    if (!phone) return { ok: false, reason: "invalid_jid" as const };

    const found = await this.findOrCreateLead(tenantId, phone, inbound.pushName);
    if (!found) {
      this.logger.warn(`Lead nao criado (sem company) phone=${phone}`);
      return { ok: false, reason: "no_company" as const };
    }

    const { lead, created: createdLead } = found;

    let conversation = await this.prisma.conversation.findFirst({
      where: { tenantId, leadId: lead.id }
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          leadId: lead.id,
          channel: "whatsapp",
          externalRef: inbound.remoteJid,
          isAiAssisted: true
        }
      });
    } else if (conversation.externalRef !== inbound.remoteJid) {
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { externalRef: inbound.remoteJid }
      });
    }

    await this.prisma.message.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        direction: "inbound",
        body: inbound.text,
        metadata: { source: "evolution_webhook" }
      }
    });

    const now = new Date();
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: now,
        updatedAt: now,
        ...conversationStateFromDirection("inbound")
      }
    });
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { lastInteractionAt: now }
    });

    await this.followupScheduler.scheduleD1(tenantId, lead.id);

    let quoteAuto: unknown = { skipped: "not_attempted" };
    try {
      quoteAuto = await this.quoteFromChat.tryAutoFromInbound(
        tenantId,
        conversation.id,
        lead.id,
        inbound.text
      );
    } catch (err) {
      this.logger.warn(`Auto-orcamento falhou: ${err}`);
    }

    this.logger.log(`Inbound WhatsApp lead=${lead.id} conv=${conversation.id} phone=${phone}`);
    return {
      ok: true as const,
      leadId: lead.id,
      conversationId: conversation.id,
      createdLead,
      quoteAuto
    };
  }
}
