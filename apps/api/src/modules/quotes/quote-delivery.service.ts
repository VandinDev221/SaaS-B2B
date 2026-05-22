import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { QuoteStatus } from "@prisma/client";
import { resolveOutboundTarget } from "../../common/utils/whatsapp-phone";
import { PrismaService } from "../../prisma/prisma.service";
import { WhatsappAdapterService } from "../integrations/whatsapp-adapter.service";
import { QuotePdfService } from "./quote-pdf.service";

@Injectable()
export class QuoteDeliveryService {
  private readonly logger = new Logger(QuoteDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: QuotePdfService,
    private readonly whatsapp: WhatsappAdapterService
  ) {}

  async sendQuotePdf(
    tenantId: string,
    quoteId: string,
    opts?: { caption?: string }
  ): Promise<{ ok: boolean; conversationId?: string; message?: string }> {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, tenantId },
      include: { lead: true }
    });
    if (!quote) throw new BadRequestException("Orcamento nao encontrado");

    const conversation = await this.prisma.conversation.findFirst({
      where: { tenantId, leadId: quote.leadId, channel: "whatsapp" }
    });

    const to = resolveOutboundTarget({
      externalRef: conversation?.externalRef,
      leadPhone: quote.lead.phone
    });
    if (!to) {
      return {
        ok: false,
        message:
          "Telefone invalido. Corrija o lead ou receba uma mensagem WhatsApp do cliente no privado."
      };
    }

    const pdf = await this.pdf.generate(tenantId, quoteId);
    const fileName = `${quote.number}.pdf`;
    const caption =
      opts?.caption ??
      `Segue seu orcamento *${quote.number}*.\nTotal: *R$ ${Number(quote.total).toFixed(2)}*\nValidade: ${quote.validUntil?.toLocaleDateString("pt-BR") ?? "—"}\n\nResponda *SIM* para aprovar.`;

    await this.whatsapp.sendDocumentMessage({
      tenantId,
      to,
      pdf,
      fileName,
      caption
    });

    await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.sent }
    });

    let conv = conversation;
    if (!conv) {
      conv = await this.prisma.conversation.create({
        data: {
          tenantId,
          leadId: quote.leadId,
          channel: "whatsapp",
          externalRef: `${to}@s.whatsapp.net`,
          isAiAssisted: true
        }
      });
    }

    await this.prisma.message.create({
      data: {
        tenantId,
        conversationId: conv.id,
        direction: "outbound",
        body: caption,
        metadata: { source: "quote_pdf_sent", quoteId, fileName }
      }
    });

    await this.prisma.conversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date(), updatedAt: new Date() }
    });

    await this.prisma.leadHistory.create({
      data: {
        tenantId,
        leadId: quote.leadId,
        kind: "quote_sent_whatsapp",
        payload: { quoteId, number: quote.number }
      }
    });

    this.logger.log(`PDF orcamento ${quote.number} enviado para ${to}`);
    return { ok: true, conversationId: conv.id };
  }
}
