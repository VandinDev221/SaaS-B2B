import { Injectable, NotFoundException } from "@nestjs/common";
import PDFKit = require("pdfkit");
import { PrismaService } from "../../prisma/prisma.service";

type QuoteItem = { sku?: string; name: string; qty: number; unitPrice: number };

@Injectable()
export class QuotePdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(tenantId: string, quoteId: string): Promise<Buffer> {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, tenantId },
      include: { lead: { include: { company: true } } }
    });
    if (!quote) throw new NotFoundException("Orcamento nao encontrado");

    const items = (quote.items as QuoteItem[]) ?? [];
    const company = quote.lead.company;

    return new Promise((resolve) => {
      const doc = new PDFKit({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fontSize(22).fillColor("#1d4ed8").text("FLOWOS", { align: "left" });
      doc.fontSize(10).fillColor("#666").text("Orcamento comercial profissional", { align: "left" });
      doc.moveDown(1.5);

      doc.fontSize(11).fillColor("#000");
      doc.text(`Numero: ${quote.number}`);
      doc.text(`Cliente: ${quote.lead.name}`);
      doc.text(`Empresa: ${company.tradeName}`);
      doc.text(`Validade: ${quote.validUntil?.toLocaleDateString("pt-BR") ?? "—"}`);
      doc.text(`Status: ${quote.status}`);
      doc.moveDown();

      doc.fontSize(12).text("Itens", { underline: true });
      doc.moveDown(0.5);
      items.forEach((item, idx) => {
        const line = item.qty * item.unitPrice;
        doc.fontSize(10).text(
          `${idx + 1}. ${item.name} — ${item.qty}x R$ ${item.unitPrice.toFixed(2)} = R$ ${line.toFixed(2)}`
        );
      });

      doc.moveDown();
      doc.fontSize(11).text(`Subtotal: R$ ${Number(quote.subtotal).toFixed(2)}`);
      doc.text(`Desconto: R$ ${Number(quote.discount).toFixed(2)}`);
      doc.fontSize(14).fillColor("#1d4ed8").font("Helvetica-Bold").text(`TOTAL: R$ ${Number(quote.total).toFixed(2)}`);
      doc.font("Helvetica");

      doc.moveDown(2);
      doc.fontSize(9).fillColor("#888").text(
        "Aprovacao digital: acesse o painel FLOWOS ou responda SIM no WhatsApp vinculado a este orcamento.",
        { align: "center" }
      );
      doc.end();
    });
  }
}
