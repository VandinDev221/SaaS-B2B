import { Injectable, Logger } from "@nestjs/common";
import { PaymentStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AutomationSettingsService } from "../settings/automation-settings.service";
import { WhatsappAdapterService } from "../integrations/whatsapp-adapter.service";
import { resolveOutboundTarget } from "../../common/utils/whatsapp-phone";

const RECOVERY_STEPS = [
  { dayOffset: -1, kind: "billing_reminder_d-1", template: "lembrete_vencimento" },
  { dayOffset: 1, kind: "billing_reminder_d+1", template: "cobranca_amigavel" },
  { dayOffset: 7, kind: "billing_reminder_d+7", template: "ultima_chance" }
] as const;

@Injectable()
export class BillingRecoveryService {
  private readonly logger = new Logger(BillingRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappAdapterService,
    private readonly tenantSettings: AutomationSettingsService
  ) {}

  async scanAllTenants() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true }
    });
    const results = [];
    for (const t of tenants) {
      if (!(await this.tenantSettings.canBillingRecovery(t.id))) continue;
      results.push(await this.scanTenant(t.id));
    }
    return results;
  }

  async scanTenant(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        status: { in: [PaymentStatus.pending, PaymentStatus.overdue] }
      },
      include: {
        quote: {
          select: {
            lead: { select: { id: true, phone: true, name: true } }
          }
        }
      },
      take: 100
    });

    const due: { paymentId: string; step: (typeof RECOVERY_STEPS)[number] }[] = [];
    const now = Date.now();

    for (const payment of payments) {
      if (!payment.dueDate) continue;
      const daysFromDue = Math.floor((now - payment.dueDate.getTime()) / (24 * 60 * 60 * 1000));

      for (const step of RECOVERY_STEPS) {
        if (daysFromDue !== step.dayOffset) continue;

        const recent = await this.prisma.leadHistory.findMany({
          where: { tenantId, kind: step.kind },
          orderBy: { createdAt: "desc" },
          take: 50
        });
        const sent = recent.some(
          (h) => (h.payload as { paymentId?: string })?.paymentId === payment.id
        );
        if (sent) continue;

        due.push({ paymentId: payment.id, step });
      }
    }

    return { tenantId, due };
  }

  async executeStep(tenantId: string, paymentId: string, stepKind: string) {
    const step = RECOVERY_STEPS.find((s) => s.kind === stepKind);
    if (!step) throw new Error(`Step desconhecido: ${stepKind}`);

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        quote: {
          include: { lead: true }
        }
      }
    });
    if (!payment) return { skipped: true, reason: "payment_not_found" };
    if (payment.status === PaymentStatus.paid) return { skipped: true, reason: "already_paid" };

    const lead = payment.quote?.lead;
    const amount = Number(payment.amount);
    const link = `${process.env.PUBLIC_WEB_URL ?? "http://localhost:3000"}/billing?pay=${payment.id}`;
    const body = this.messageForStep(step.template, {
      amount,
      link,
      leadName: lead?.name ?? "cliente",
      dueDate: payment.dueDate
    });

    let waSent = false;
    if (lead?.phone) {
      const to = resolveOutboundTarget({ leadPhone: lead.phone, externalRef: null });
      if (to) {
        try {
          await this.whatsapp.sendTemplateMessage({
            tenantId,
            to,
            templateName: step.template,
            body
          });
          waSent = true;
        } catch (e) {
          this.logger.warn(`WA cobranca falhou payment=${paymentId}: ${e}`);
        }
      }
    }

    if (lead) {
      await this.prisma.leadHistory.create({
        data: {
          tenantId,
          leadId: lead.id,
          kind: step.kind,
          payload: { paymentId, step: step.template, waSent, amount, link }
        }
      });
    } else {
      await this.prisma.analyticsEvent.create({
        data: {
          tenantId,
          eventName: step.kind,
          eventData: { paymentId, waSent, amount, link }
        }
      });
    }

    return { ok: true, paymentId, step: step.kind, waSent };
  }

  private messageForStep(
    template: string,
    ctx: { amount: number; link: string; leadName: string; dueDate: Date | null }
  ) {
    const valor = ctx.amount.toFixed(2).replace(".", ",");
    const venc = ctx.dueDate
      ? ctx.dueDate.toLocaleDateString("pt-BR")
      : "em breve";

    const messages: Record<string, string> = {
      lembrete_vencimento: `Ola ${ctx.leadName}! Lembrete: cobranca de R$ ${valor} vence em ${venc}. Pague via PIX: ${ctx.link}`,
      cobranca_amigavel: `Ola ${ctx.leadName}, identificamos pendencia de R$ ${valor}. Link de pagamento: ${ctx.link}`,
      ultima_chance: `${ctx.leadName}, ultima chance para regularizar R$ ${valor} com facilidade: ${ctx.link}`
    };
    return messages[template] ?? messages.cobranca_amigavel;
  }

  async handleAutomationEvent(payload: Record<string, unknown>) {
    const eventName = String(payload.eventName ?? "");
    if (eventName === "billing.charge.created" && payload.paymentId) {
      return { ok: true, note: "charge_created" };
    }
    if (eventName === "billing.payment.overdue" && payload.paymentId) {
      return this.executeStep(
        String(payload.tenantId),
        String(payload.paymentId),
        "billing_reminder_d+1"
      );
    }
    return { ok: true, skipped: true };
  }
}
