import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { conversationStateFromDirection } from "../../common/utils/conversation-message-state";
import { resolveOutboundTarget } from "../../common/utils/whatsapp-phone";
import { PrismaService } from "../../prisma/prisma.service";
import { AutomationService } from "../automation/automation.service";
import { FollowupSchedulerService } from "../automation/followup-scheduler.service";
import { EvolutionApiClient } from "../integrations/evolution-api.client";
import { WhatsappAdapterService } from "../integrations/whatsapp-adapter.service";
import { WhatsappWebhookService } from "./whatsapp-webhook.service";

@Injectable()
export class WhatsappService {
  private readonly evolutionSyncAt = new Map<string, number>();
  private readonly evolutionSyncMs = 4_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly automation: AutomationService,
    private readonly followupScheduler: FollowupSchedulerService,
    private readonly adapter: WhatsappAdapterService,
    private readonly evolution: EvolutionApiClient,
    private readonly webhook: WhatsappWebhookService
  ) {}

  private async syncEvolutionInbox(tenantId: string, force = false) {
    if (!this.evolution.isConfigured()) return;
    const now = Date.now();
    const last = this.evolutionSyncAt.get(tenantId) ?? 0;
    if (!force && now - last < this.evolutionSyncMs) return;
    this.evolutionSyncAt.set(tenantId, now);
    try {
      await this.webhook.syncInboxFromEvolution(tenantId);
    } catch {
      // Evolution pode estar hibernando no Render free
    }
  }

  async syncInbox(tenantId: string) {
    await this.syncEvolutionInbox(tenantId, true);
    return { ok: true };
  }

  async listConversations(
    tenantId: string,
    filter?: "needs_reply" | "replied" | "all",
    opts?: { forceSync?: boolean }
  ) {
    await this.syncEvolutionInbox(tenantId, opts?.forceSync === true);
    const where =
      filter === "needs_reply"
        ? { tenantId, needsReply: true }
        : filter === "replied"
          ? { tenantId, needsReply: false }
          : { tenantId };

    return this.prisma.conversation.findMany({
      where,
      include: {
        lead: true,
        messages: { take: 20, orderBy: { createdAt: "desc" } }
      },
      orderBy: [{ needsReply: "desc" }, { lastMessageAt: "desc" }],
      take: 100
    });
  }

  async countByFilter(tenantId: string) {
    const [needsReply, replied, total] = await Promise.all([
      this.prisma.conversation.count({ where: { tenantId, needsReply: true } }),
      this.prisma.conversation.count({ where: { tenantId, needsReply: false } }),
      this.prisma.conversation.count({ where: { tenantId } })
    ]);
    return { needsReply, replied, total };
  }

  async sendTemplate(tenantId: string, to: string, templateName: string) {
    const providerResult = await this.adapter.sendTemplateMessage({ tenantId, to, templateName });
    await this.automation.enqueue("whatsapp.template.sent", { tenantId, to, templateName });
    return providerResult;
  }

  private resolveRecipient(conv: { externalRef: string | null; lead: { phone: string | null } }) {
    return resolveOutboundTarget({
      externalRef: conv.externalRef,
      leadPhone: conv.lead.phone
    });
  }

  private async resolveRecipientWithLid(
    conv: { id: string; externalRef: string | null; lead: { phone: string | null } }
  ): Promise<string | null> {
    const fromRef = resolveOutboundTarget({
      externalRef: conv.externalRef,
      leadPhone: conv.lead.phone
    });
    if (fromRef) return fromRef;

    const lastInbound = await this.prisma.message.findFirst({
      where: { conversationId: conv.id, direction: "inbound" },
      orderBy: { createdAt: "desc" },
      select: { metadata: true }
    });
    const meta = (lastInbound?.metadata ?? {}) as Record<string, unknown>;
    const altPhone = String(meta.whatsappPhone ?? "").trim();
    if (altPhone) return altPhone;

    return null;
  }

  async sendMessage(tenantId: string, conversationId: string, body: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: { lead: true }
    });
    if (!conv) throw new NotFoundException("Conversa nao encontrada");

    const to = await this.resolveRecipientWithLid(conv);
    if (!to) {
      throw new BadRequestException(
        "Telefone invalido para WhatsApp. Corrija o numero do lead no CRM (ex.: +55 DDD 9XXXX-XXXX) ou peca ao cliente enviar uma nova mensagem."
      );
    }

    let providerMessageId: string | undefined;
    let deliveryStatus: string | undefined;
    try {
      const sent = await this.adapter.sendTemplateMessage({
        tenantId,
        to,
        templateName: "free_text",
        body
      });
      providerMessageId = sent.providerMessageId;
      deliveryStatus = sent.deliveryStatus;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Falha ao enviar WhatsApp: ${reason}`);
    }

    const message = await this.prisma.message.create({
      data: {
        tenantId,
        conversationId,
        direction: "outbound",
        body,
        metadata: { source: "flowos_inbox", providerMessageId, to, deliveryStatus }
      }
    });

    const now = new Date();
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: now,
        updatedAt: now,
        ...conversationStateFromDirection("outbound")
      }
    });

    await this.prisma.lead.update({
      where: { id: conv.leadId },
      data: { lastInteractionAt: now }
    });

    await this.automation.enqueue("whatsapp.message.sent", { tenantId, conversationId, messageId: message.id });
    await this.followupScheduler.cancelD1(tenantId, conv.leadId);
    return message;
  }

  async deleteConversation(tenantId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId }
    });
    if (!conv) throw new NotFoundException("Conversa nao encontrada");

    await this.prisma.conversation.delete({ where: { id: conversationId } });

    await this.prisma.leadHistory.create({
      data: {
        tenantId,
        leadId: conv.leadId,
        kind: "conversation_deleted",
        payload: { conversationId, channel: conv.channel }
      }
    });

    return { ok: true, leadId: conv.leadId };
  }
}
