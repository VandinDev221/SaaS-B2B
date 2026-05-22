import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentStatus, Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { isProductionEnv } from "../../config/env.validation";
import { verifyMercadoPagoWebhook } from "../../common/security/mercadopago-webhook.util";
import { resolveOutboundTarget } from "../../common/utils/whatsapp-phone";
import { verifyWebhookSignature } from "../../common/security/webhook-signature.util";
import { PrismaService } from "../../prisma/prisma.service";
import { AutomationService } from "../automation/automation.service";
import { MercadoPagoClient } from "../integrations/mercado-pago.client";
import { WhatsappOutboundQueue } from "../integrations/whatsapp-outbound.queue";

type Provider = "stripe" | "mercado_pago" | "pix";

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly automation: AutomationService,
    private readonly mercadoPago: MercadoPagoClient,
    private readonly whatsappQueue: WhatsappOutboundQueue
  ) {}

  listPayments(tenantId: string, status?: PaymentStatus) {
    return this.prisma.payment.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { quote: { select: { id: true, number: true, leadId: true } } }
    });
  }

  listOverdue(tenantId: string) {
    return this.prisma.payment.findMany({
      where: {
        tenantId,
        status: { in: [PaymentStatus.pending, PaymentStatus.overdue] },
        dueDate: { lt: new Date() }
      },
      orderBy: { dueDate: "asc" },
      take: 50,
      include: { quote: { select: { number: true } } }
    });
  }

  async createCharge(input: {
    tenantId: string;
    provider: Provider;
    amount: number;
    quoteId?: string;
    idempotencyKey?: string;
    dueDays?: number;
  }) {
    if (input.provider === "stripe") {
      throw new BadRequestException(
        "Stripe ainda nao disponivel. Use mercado_pago ou pix com Mercado Pago configurado."
      );
    }

    if (input.provider === "pix" && !this.mercadoPago.isConfigured) {
      const isProd = isProductionEnv(this.config as unknown as Record<string, unknown>);
      if (isProd || this.config.get<string>("ALLOW_PIX_MOCK", "false") !== "true") {
        throw new ServiceUnavailableException(
          "PIX requer MERCADOPAGO_ACCESS_TOKEN. Configure o Mercado Pago."
        );
      }
    }

    const effectiveProvider: Provider =
      input.provider === "pix" && this.mercadoPago.isConfigured ? "mercado_pago" : input.provider;

    if (input.idempotencyKey) {
      const existing = await this.prisma.payment.findFirst({
        where: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey }
      });
      if (existing) return this.enrichPayment(existing);
    }

    const dueDate = new Date(Date.now() + (input.dueDays ?? 3) * 24 * 60 * 60 * 1000);
    let providerRef = `${effectiveProvider}_${Date.now()}`;
    let metadata: Record<string, unknown> = {};

    if (effectiveProvider === "mercado_pago" && this.mercadoPago.isConfigured) {
      const mp = await this.mercadoPago.createPixPayment({
        amount: input.amount,
        description: `Cobranca FLOWOS ${input.quoteId ?? "avulsa"}`,
        externalReference: input.idempotencyKey ?? `flowos_${Date.now()}`,
        payerEmail: undefined
      });
      if (mp) {
        providerRef = mp.paymentId;
        metadata = {
          mercadoPagoId: mp.paymentId,
          copyPaste: mp.copyPaste,
          qrCodeBase64: mp.qrCodeBase64,
          ticketUrl: mp.ticketUrl
        };
      }
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId: input.tenantId,
        quoteId: input.quoteId,
        idempotencyKey: input.idempotencyKey,
        provider: effectiveProvider,
        providerRef,
        amount: input.amount,
        dueDate,
        status: PaymentStatus.pending,
        metadata: Object.keys(metadata).length ? (metadata as Prisma.InputJsonValue) : undefined
      },
      include: { quote: { select: { number: true, leadId: true } } }
    });

    await this.automation.enqueue("billing.charge.created", {
      tenantId: input.tenantId,
      paymentId: payment.id,
      provider: effectiveProvider
    });

    return this.enrichPayment(payment);
  }

  private enrichPayment(payment: {
    id: string;
    tenantId: string;
    provider: string;
    providerRef: string | null;
    amount: unknown;
    status: PaymentStatus;
    dueDate: Date | null;
    metadata?: unknown;
    quote?: { number: string } | null;
  }) {
    const amount = Number(payment.amount);
    const meta = (payment.metadata ?? {}) as {
      copyPaste?: string;
      qrCodeBase64?: string;
      ticketUrl?: string;
    };
    const allowMock =
      !isProductionEnv(this.config as unknown as Record<string, unknown>) &&
      this.config.get<string>("ALLOW_PIX_MOCK", "false") === "true";

    let copyPaste = meta.copyPaste;
    let txid: string | undefined;

    if (!copyPaste) {
      if (!allowMock) {
        throw new ServiceUnavailableException(
          "PIX indisponivel: configure MERCADOPAGO_ACCESS_TOKEN"
        );
      }
      const mockPix = this.buildPixPayload(payment.id, amount);
      copyPaste = mockPix.copyPaste;
      txid = mockPix.txid;
    }

    const paymentLink = `${this.config.get("PUBLIC_WEB_URL", "http://localhost:3000")}/billing?pay=${payment.id}`;

    return {
      ...payment,
      amount,
      pix: {
        txid: txid ?? payment.id.slice(0, 25),
        copyPaste,
        qrCodeData: copyPaste,
        qrCodeBase64: meta.qrCodeBase64 ?? null,
        amount,
        expiresInMinutes: 30,
        isMock: !meta.copyPaste && allowMock
      },
      paymentLink,
      recoverySequence: ["D-1 lembrete", "D+1 WhatsApp", "D+7 ultima chance"]
    };
  }

  async sendPaymentLinkWhatsApp(tenantId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        quote: { include: { lead: true } }
      }
    });
    if (!payment) throw new NotFoundException("Cobranca nao encontrada");

    const lead = payment.quote?.lead;
    if (!lead?.phone) throw new NotFoundException("Lead sem telefone para WhatsApp");

    const enriched = this.enrichPayment(payment);
    const to = resolveOutboundTarget({ leadPhone: lead.phone, externalRef: null });
    if (!to) throw new NotFoundException("Telefone invalido");

    const body = `Ola ${lead.name}! Segue link de pagamento de R$ ${Number(payment.amount).toFixed(2)}: ${enriched.paymentLink}\nPIX copia e cola: ${enriched.pix?.copyPaste?.slice(0, 80)}...`;

    await this.whatsappQueue.enqueue({
      tenantId,
      to,
      templateName: "payment_link",
      body
    });

    return { ok: true, queued: true, paymentLink: enriched.paymentLink };
  }

  async processMercadoPagoWebhook(
    body: { data?: { id?: string }; action?: string },
    headers: { xSignature?: string; xRequestId?: string }
  ) {
    const mpId = body.data?.id ? String(body.data.id) : null;
    if (!mpId) return { ok: false };

    const webhookSecret = this.config.get<string>("MERCADOPAGO_WEBHOOK_SECRET");
    const isProd = isProductionEnv(this.config as unknown as Record<string, unknown>);
    if (isProd && !webhookSecret) {
      throw new ForbiddenException("MERCADOPAGO_WEBHOOK_SECRET obrigatorio em producao");
    }
    if (webhookSecret && headers.xSignature && headers.xRequestId) {
      const valid = verifyMercadoPagoWebhook({
        secret: webhookSecret,
        xSignature: headers.xSignature,
        xRequestId: headers.xRequestId,
        dataId: mpId
      });
      if (!valid) throw new ForbiddenException("Assinatura Mercado Pago invalida");
    } else if (isProd) {
      throw new ForbiddenException("Headers de assinatura Mercado Pago ausentes");
    }

    const status = await this.mercadoPago.getPaymentStatus(mpId);
    if (status !== "approved") return { ok: true, status };

    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: mpId, provider: "mercado_pago" }
    });
    if (!payment) return { ok: true, notFound: true };

    await this.markPaid(payment.tenantId, payment.id);
    return { ok: true, paid: true, paymentId: payment.id };
  }

  private buildPixPayload(paymentId: string, amount: number) {
    const txid = paymentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25).toUpperCase();
    const emv = `00020126580014br.gov.bcb.pix0136${txid}520400005303986540${amount.toFixed(2)}5802BR5925FLOWOS6009SAO PAULO62070503***6304`;
    const crc = createHash("sha256").update(emv).digest("hex").slice(0, 4).toUpperCase();
    const copyPaste = `${emv}${crc}`;
    return {
      txid,
      copyPaste,
      qrCodeData: copyPaste,
      amount,
      expiresInMinutes: 30
    };
  }

  async getPayment(tenantId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: { quote: true }
    });
    if (!payment) throw new NotFoundException("Cobranca nao encontrada");
    return this.enrichPayment(payment);
  }

  async markPaid(tenantId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, tenantId } });
    if (!payment) throw new NotFoundException("Cobranca nao encontrada");

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.paid, paidAt: new Date() }
    });

    if (payment.quoteId) {
      const quote = await this.prisma.quote.findUnique({ where: { id: payment.quoteId } });
      if (quote) {
        await this.prisma.lead.update({
          where: { id: quote.leadId },
          data: { stage: "won", lastInteractionAt: new Date() }
        });
      }
    }

    await this.automation.enqueue("billing.payment.paid", { tenantId, paymentId });
    return updated;
  }

  async markOverdue(tenantId: string) {
    const result = await this.prisma.payment.updateMany({
      where: {
        tenantId,
        status: PaymentStatus.pending,
        dueDate: { lt: new Date() }
      },
      data: { status: PaymentStatus.overdue }
    });

    const overdue = await this.listOverdue(tenantId);
    for (const p of overdue) {
      await this.automation.enqueue("billing.payment.overdue", { tenantId, paymentId: p.id });
    }

    return { updated: result.count, overdue: overdue.length };
  }

  async createSubscription(input: { tenantId: string; userId: string; planCode: string }) {
    const user = await this.prisma.user.findFirst({ where: { id: input.userId, tenantId: input.tenantId } });
    if (!user) throw new NotFoundException("Usuario nao encontrado");

    const plan = await this.prisma.plan.findUnique({ where: { code: input.planCode } });
    if (!plan) throw new NotFoundException("Plano nao encontrado");

    const existing = await this.prisma.subscription.findFirst({
      where: { tenantId: input.tenantId, companyId: user.companyId, status: "active" }
    });
    if (existing) return existing;

    return this.prisma.subscription.create({
      data: {
        tenantId: input.tenantId,
        companyId: user.companyId,
        planId: plan.id,
        status: "active",
        startedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      include: { plan: true }
    });
  }

  async processWebhook(input: {
    provider: string;
    signature: string;
    timestamp: string;
    body: {
      tenantId: string;
      eventId: string;
      eventType: string;
      paymentId?: string;
    };
  }) {
    const secret = this.config.get<string>("WEBHOOK_SIGNING_SECRET", "dev-webhook-secret");
    const valid = verifyWebhookSignature({
      secret,
      signature: input.signature,
      timestamp: input.timestamp,
      body: input.body
    });
    if (!valid) throw new ForbiddenException("Assinatura de webhook invalida");

    const existing = await this.prisma.inboxEvent.findUnique({
      where: {
        tenantId_provider_eventId: {
          tenantId: input.body.tenantId,
          provider: input.provider,
          eventId: input.body.eventId
        }
      }
    });
    if (existing) {
      return { received: true, duplicated: true, provider: input.provider };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.inboxEvent.create({
        data: {
          tenantId: input.body.tenantId,
          provider: input.provider,
          eventId: input.body.eventId,
          eventType: input.body.eventType,
          payload: input.body,
          processedAt: new Date()
        }
      });

      if (input.body.paymentId && input.body.eventType === "payment.paid") {
        await tx.payment.updateMany({
          where: { id: input.body.paymentId, tenantId: input.body.tenantId },
          data: { status: PaymentStatus.paid, paidAt: new Date() }
        });
      }

      await tx.outboxEvent.create({
        data: {
          tenantId: input.body.tenantId,
          aggregate: "payment",
          aggregateId: input.body.paymentId ?? input.body.eventId,
          eventName: `billing.${input.body.eventType}`,
          payload: input.body
        }
      });
    });

    return { received: true, duplicated: false, provider: input.provider };
  }

  async dispatchPendingOutbox(tenantId: string) {
    const pending = await this.prisma.outboxEvent.findMany({
      where: { tenantId, publishedAt: null },
      orderBy: { createdAt: "asc" },
      take: 100
    });

    for (const event of pending) {
      await this.automation.enqueue(event.eventName, {
        tenantId: event.tenantId,
        outboxEventId: event.id,
        ...((event.payload as Record<string, unknown>) ?? {})
      });
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { publishedAt: new Date() }
      });
    }

    return { dispatched: pending.length };
  }

  getRecoveryPlaybook() {
    return {
      name: "Recuperacao de inadimplencia",
      steps: [
        { day: -1, channel: "whatsapp", template: "lembrete_vencimento" },
        { day: 1, channel: "whatsapp", template: "cobranca_amigavel" },
        { day: 7, channel: "email", template: "ultima_chance" },
        { day: 14, channel: "whatsapp", template: "desconto_quitacao" }
      ]
    };
  }
}
