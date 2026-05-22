import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { QuoteStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { FollowupSchedulerService } from "../automation/followup-scheduler.service";
import { getCatalog } from "./catalog";
import { QuoteDeliveryService } from "./quote-delivery.service";
import { QuotePdfService } from "./quote-pdf.service";

type QuoteItem = { sku?: string; name: string; qty: number; unitPrice: number };

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly followupScheduler: FollowupSchedulerService,
    private readonly pdf: QuotePdfService,
    private readonly moduleRef: ModuleRef
  ) {}

  list(tenantId: string) {
    return this.prisma.quote.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { lead: { select: { id: true, name: true, phone: true, stage: true } } }
    });
  }

  getCatalog(niche: string) {
    return getCatalog(niche);
  }

  async create(
    tenantId: string,
    input: { leadId: string; items: QuoteItem[]; discount?: number; validDays?: number }
  ) {
    const lead = await this.prisma.lead.findFirst({ where: { id: input.leadId, tenantId } });
    if (!lead) throw new NotFoundException("Lead nao encontrado");

    const subtotal = input.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const discount = input.discount ?? 0;
    const total = Math.max(0, subtotal - discount);
    const number = `ORC-${Date.now().toString(36).toUpperCase()}`;

    const quote = await this.prisma.quote.create({
      data: {
        tenantId,
        leadId: input.leadId,
        number,
        status: QuoteStatus.draft,
        subtotal,
        discount,
        total,
        validUntil: new Date(Date.now() + (input.validDays ?? 7) * 24 * 60 * 60 * 1000),
        items: input.items
      },
      include: { lead: true }
    });

    await this.prisma.lead.update({
      where: { id: input.leadId },
      data: { stage: "proposal_sent", lastInteractionAt: new Date() }
    });

    await this.prisma.leadHistory.create({
      data: { tenantId, leadId: input.leadId, kind: "quote_created", payload: { quoteId: quote.id, number } }
    });

    await this.followupScheduler.scheduleD1(tenantId, input.leadId);

    const knowledge = await this.prisma.tenantAiKnowledge.findUnique({ where: { tenantId } });
    if (knowledge?.autoSendQuotePdf !== false) {
      try {
        const delivery = this.moduleRef.get(QuoteDeliveryService, { strict: false });
        await delivery.sendQuotePdf(tenantId, quote.id);
      } catch (err) {
        this.logger.warn(`Auto-envio PDF falhou: ${err}`);
      }
    }

    return quote;
  }

  async send(tenantId: string, quoteId: string) {
    const delivery = this.moduleRef.get(QuoteDeliveryService, { strict: false });
    return delivery.sendQuotePdf(tenantId, quoteId);
  }

  generatePdf(tenantId: string, quoteId: string) {
    return this.pdf.generate(tenantId, quoteId);
  }

  async approve(tenantId: string, quoteId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, tenantId },
      include: { lead: true }
    });
    if (!quote) throw new NotFoundException("Orcamento nao encontrado");

    const updated = await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.approved, approvedAt: new Date() }
    });

    await this.prisma.lead.update({
      where: { id: quote.leadId },
      data: { stage: "negotiation", lastInteractionAt: new Date() }
    });

    return updated;
  }

}
