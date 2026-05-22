import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AutomationSettingsService } from "../settings/automation-settings.service";
import { WhatsappAdapterService } from "../integrations/whatsapp-adapter.service";
import { resolveOutboundTarget } from "../../common/utils/whatsapp-phone";

@Injectable()
export class PostSaleExecutorService {
  private readonly logger = new Logger(PostSaleExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappAdapterService,
    private readonly tenantSettings: AutomationSettingsService
  ) {}

  async scanDueRuns() {
    const allRuns = await this.prisma.postSaleRun.findMany({
      where: {
        status: "pending",
        scheduledAt: { lte: new Date() }
      },
      include: {
        campaign: true,
        lead: true
      },
      take: 50
    });

    const runs = [];
    for (const run of allRuns) {
      if (await this.tenantSettings.canPostSale(run.tenantId)) runs.push(run);
    }
    return runs;
  }

  async executeRun(runId: string) {
    const run = await this.prisma.postSaleRun.findUnique({
      where: { id: runId },
      include: { campaign: true, lead: true }
    });
    if (!run || run.status !== "pending") return { skipped: true };
    if (!(await this.tenantSettings.canPostSale(run.tenantId))) {
      return { skipped: true, reason: "post_sale_disabled" };
    }

    const lead = run.lead;
    if (!lead?.phone) {
      await this.prisma.postSaleRun.update({
        where: { id: runId },
        data: { status: "skipped", executedAt: new Date(), result: { reason: "no_phone" } }
      });
      return { skipped: true, reason: "no_phone" };
    }

    const to = resolveOutboundTarget({ leadPhone: lead.phone, externalRef: null });
    const daysSince = Math.round(
      (Date.now() - run.scheduledAt.getTime() + 7 * 24 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000)
    );
    const discount =
      (run.campaign.config as { discountPercent?: number })?.discountPercent ?? 5;

    const body =
      run.campaign.type === "reactivation"
        ? `Ola ${lead.name}! Sentimos sua falta. Temos condicao especial para voce voltar. Responda SIM para falar com nosso time.`
        : `Ola ${lead.name}! Passando para acompanhar seu atendimento (D+${daysSince}). Precisa de algo? Oferta exclusiva: ${discount}% em servicos complementares.`;

    let waSent = false;
    if (to) {
      try {
        await this.whatsapp.sendTemplateMessage({
          tenantId: run.tenantId,
          to,
          templateName: "postsale_followup",
          body
        });
        waSent = true;
      } catch (e) {
        this.logger.warn(`Post-sale WA falhou run=${runId}: ${e}`);
      }
    }

    await this.prisma.postSaleRun.update({
      where: { id: runId },
      data: {
        status: waSent ? "completed" : "failed",
        executedAt: new Date(),
        result: { waSent, bodyPreview: body.slice(0, 120) }
      }
    });

    if (lead) {
      await this.prisma.leadHistory.create({
        data: {
          tenantId: run.tenantId,
          leadId: lead.id,
          kind: "postsale_sent",
          payload: { runId, campaignId: run.campaignId, waSent }
        }
      });
    }

    return { ok: true, runId, waSent };
  }
}
