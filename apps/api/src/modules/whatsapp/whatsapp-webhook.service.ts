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
  jidToWhatsAppDigits,
  normalizeWhatsAppContact,
  resolveInboundPhone,
  toE164
} from "../../common/utils/whatsapp-phone";
import { conversationStateFromDirection } from "../../common/utils/conversation-message-state";
import { EvolutionApiClient } from "../integrations/evolution-api.client";
import { PrismaService } from "../../prisma/prisma.service";
import { FollowupSchedulerService } from "../automation/followup-scheduler.service";

export type EvolutionInboundMessage = {
  remoteJid: string;
  text: string;
  pushName?: string;
  evolutionMessageId?: string;
  lidJid?: string;
};

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly followupScheduler: FollowupSchedulerService,
    private readonly evolution: EvolutionApiClient,
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
      const lidJid = String(key.remoteJid ?? "");
      let remoteJid = phone ? digitsToWhatsAppJid(phone) : null;
      if (!remoteJid && lidJid.endsWith("@lid")) remoteJid = lidJid;
      if (!remoteJid) {
        this.logger.debug(
          `Webhook: JID sem telefone BR key=${JSON.stringify({
            remoteJid: key.remoteJid,
            remoteJidAlt: key.remoteJidAlt,
            sender: enrichedRow.sender
          })}`
        );
        continue;
      }

      const message = (row.message ?? body.message ?? {}) as Record<string, unknown>;
      const text = extractEvolutionMessageText(message);
      if (!text.trim()) {
        this.logger.debug(`Webhook: mensagem sem texto processavel phone=${phone ?? lidJid}`);
        continue;
      }

      out.push({
        remoteJid,
        text: text.trim(),
        pushName: String(row.pushName ?? body.pushName ?? "").trim() || undefined,
        evolutionMessageId: String(key.id ?? "").trim() || undefined,
        lidJid: lidJid.endsWith("@lid") ? lidJid : undefined
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
    const normalized = normalizeWhatsAppContact(phoneDigits);
    if (!normalized) return null;
    const e164 = toE164(normalized);

    const existing = await this.prisma.lead.findFirst({
      where: {
        tenantId,
        OR: [{ phone: e164 }, { phone: normalized }]
      }
    });

    if (existing) {
      if (existing.phone !== e164) {
        await this.prisma.lead.update({
          where: { id: existing.id },
          data: { phone: e164, ...(pushName ? { name: pushName } : {}) }
        });
      }
      return { lead: { ...existing, phone: e164 }, created: false };
    }

    let company = await this.prisma.company.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "asc" }
    });

    if (!company) {
      const owner = await this.prisma.user.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { companyId: true }
      });
      if (owner?.companyId) {
        company = await this.prisma.company.findFirst({
          where: { id: owner.companyId, tenantId }
        });
      }
    }

    if (!company) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return null;
      company = await this.prisma.company.create({
        data: {
          tenantId,
          legalName: tenant.name,
          tradeName: tenant.name,
          industry: tenant.niche ?? "geral"
        }
      });
      this.logger.warn(`Company criada automaticamente para tenant=${tenantId} (webhook inbound)`);
    }

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

  async ingestInbound(
    tenantId: string,
    inbound: EvolutionInboundMessage,
    opts?: { evolutionMessageId?: string; lidJid?: string; source?: "evolution_sync" | "evolution_webhook" }
  ) {
    let phone =
      resolveInboundPhone({ remoteJid: inbound.remoteJid, remoteJidAlt: inbound.remoteJid }, {}) ??
      jidToWhatsAppDigits(inbound.remoteJid);
    if (!phone && opts?.lidJid) {
      phone = await this.resolvePhoneFromLid(tenantId, opts.lidJid);
    }
    if (!phone) return { ok: false, reason: "invalid_jid" as const };

    if (opts?.evolutionMessageId) {
      const dup = await this.prisma.message.findFirst({
        where: {
          tenantId,
          metadata: { path: ["evolutionMessageId"], equals: opts.evolutionMessageId }
        }
      });
      if (dup) return { ok: true, skipped: "duplicate" as const, conversationId: dup.conversationId };
    }

    const found = await this.findOrCreateLead(tenantId, phone, inbound.pushName);
    if (!found) {
      this.logger.warn(`Lead nao criado (sem company) phone=${phone}`);
      return { ok: false, reason: "no_company" as const };
    }

    const { lead, created: createdLead } = found;

    const phoneJid = digitsToWhatsAppJid(phone) ?? inbound.remoteJid;
    const externalRef = phoneJid;

    let conversation = await this.prisma.conversation.findFirst({
      where: { tenantId, leadId: lead.id }
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          leadId: lead.id,
          channel: "whatsapp",
          externalRef,
          isAiAssisted: true
        }
      });
    } else if (phoneJid && conversation.externalRef !== phoneJid) {
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { externalRef: phoneJid }
      });
    }

    await this.prisma.message.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        direction: "inbound",
        body: inbound.text,
        metadata: {
          source: opts?.source ?? "evolution_webhook",
          whatsappPhone: phone,
          ...(opts?.evolutionMessageId ? { evolutionMessageId: opts.evolutionMessageId } : {}),
          ...(opts?.lidJid ? { whatsappLid: opts.lidJid } : {})
        }
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

  private async resolvePhoneFromLid(tenantId: string, lidJid: string): Promise<string | null> {
    const conv = await this.prisma.conversation.findFirst({
      where: {
        tenantId,
        OR: [{ externalRef: lidJid }, { messages: { some: { metadata: { path: ["whatsappLid"], equals: lidJid } } } }]
      },
      include: { lead: true }
    });
    if (!conv?.lead?.phone) return null;
    return normalizeWhatsAppContact(conv.lead.phone);
  }

  /** Busca mensagens recentes na Evolution quando webhook falha (Render cold start). */
  async syncInboxFromEvolution(tenantId: string) {
    if (!this.evolution.isConfigured()) return { imported: 0, skipped: 0 };

    const raw = await this.evolution.findRecentMessages(50);
    const records = [...(raw.messages?.records ?? [])].sort((a, b) => {
      const ta = Number(a.messageTimestamp ?? 0);
      const tb = Number(b.messageTimestamp ?? 0);
      return ta - tb;
    });

    const lidPhoneMap = this.buildLidPhoneMap(records);
    let imported = 0;
    let skipped = 0;

    for (const row of records) {
      const result = await this.ingestEvolutionRecord(tenantId, row, lidPhoneMap);
      if (result.ok && !("skipped" in result && result.skipped)) imported++;
      else skipped++;
    }

    if (imported > 0) {
      this.logger.log(`Evolution sync tenant=${tenantId} imported=${imported} skipped=${skipped}`);
    }

    for (const [lid, phone] of lidPhoneMap) {
      await this.repairOutboundTarget(tenantId, lid, phone);
    }

    return { imported, skipped };
  }

  /** Corrige telefone do lead e externalRef com o numero real da Evolution (nao @lid). */
  private async repairOutboundTarget(tenantId: string, lid: string, phone: string) {
    const e164 = toE164(phone);
    const phoneJid = digitsToWhatsAppJid(phone);
    const suffix = phone.slice(-8);
    const convs = await this.prisma.conversation.findMany({
      where: {
        tenantId,
        channel: "whatsapp",
        OR: [
          { externalRef: lid },
          { lead: { phone: e164 } },
          { lead: { phone: { endsWith: suffix } } },
          { messages: { some: { metadata: { path: ["whatsappLid"], equals: lid } } } }
        ]
      },
      include: { lead: true }
    });

    for (const conv of convs) {
      if (conv.lead.phone !== e164) {
        await this.prisma.lead.update({
          where: { id: conv.leadId },
          data: { phone: e164 }
        });
      }
      if (phoneJid && conv.externalRef !== phoneJid) {
        await this.prisma.conversation.update({
          where: { id: conv.id },
          data: { externalRef: phoneJid }
        });
      }
    }
  }

  private buildLidPhoneMap(records: Record<string, unknown>[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const row of records) {
      const key = (row.key ?? {}) as Record<string, unknown>;
      const lid = String(key.remoteJid ?? "");
      if (!lid.endsWith("@lid")) continue;
      const phone = resolveInboundPhone(key, { ...row, senderPn: row.senderPn ?? key.senderPn });
      if (phone) map.set(lid, phone);
    }
    return map;
  }

  async ingestEvolutionRecord(
    tenantId: string,
    row: Record<string, unknown>,
    lidPhoneMap?: Map<string, string>
  ) {
    const key = (row.key ?? {}) as Record<string, unknown>;
    if (isEvolutionFromMe(key)) return { ok: true, skipped: "from_me" as const };

    const message = (row.message ?? {}) as Record<string, unknown>;
    const text = extractEvolutionMessageText(message);
    if (!text.trim()) return { ok: true, skipped: "sem_texto" as const };

    const enrichedRow = {
      ...row,
      senderPn: row.senderPn ?? key.senderPn
    };
    let phone = resolveInboundPhone(key, enrichedRow);
    const lidJid = String(key.remoteJid ?? "");
    const altJid = String(key.remoteJidAlt ?? "");
    let remoteJid = altJid || (jidToWhatsAppDigits(lidJid) ? lidJid : "");

    if (!phone && lidJid.endsWith("@lid")) {
      phone = lidPhoneMap?.get(lidJid) ?? (await this.resolvePhoneFromLid(tenantId, lidJid));
    }
    if (phone && !remoteJid) {
      remoteJid = digitsToWhatsAppJid(phone) ?? remoteJid;
    }
    if (!phone || !remoteJid) return { ok: false, reason: "invalid_jid" as const };

    const result = await this.ingestInbound(
      tenantId,
      {
        remoteJid,
        text: text.trim(),
        pushName: String(row.pushName ?? "").trim() || undefined
      },
      {
        evolutionMessageId: String(key.id ?? "").trim() || undefined,
        lidJid: lidJid.endsWith("@lid") ? lidJid : undefined,
        source: "evolution_sync"
      }
    );
    return result;
  }
}
