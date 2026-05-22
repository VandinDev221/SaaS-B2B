import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LeadStage } from "@prisma/client";
import { digitsToWhatsAppJid } from "../../common/utils/whatsapp-phone";
import { PrismaService } from "../../prisma/prisma.service";
import { conversationStateFromDirection } from "../../common/utils/conversation-message-state";
import { WhatsappAdapterService } from "../integrations/whatsapp-adapter.service";
import { AutomationSettingsService } from "../settings/automation-settings.service";
import { FOLLOWUP_D7_PLAYBOOK } from "./automation.constants";

@Injectable()
export class FollowupD7Service {
  private readonly logger = new Logger(FollowupD7Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappAdapterService,
    private readonly config: ConfigService,
    private readonly tenantSettings: AutomationSettingsService
  ) {}

  private afterDays(): number {
    return Number(this.config.get<string>("FOLLOWUP_D7_AFTER_DAYS", "7"));
  }

  async scanAllTenants() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true }
    });
    const results = [];
    for (const t of tenants) {
      if (!(await this.tenantSettings.canScanFollowupD7(t.id))) continue;
      results.push(await this.scanTenant(t.id));
    }
    return results;
  }

  async scanTenant(tenantId: string) {
    const days = this.afterDays();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const leads = await this.prisma.lead.findMany({
      where: { tenantId, stage: { notIn: [LeadStage.won, LeadStage.lost] } },
      select: { id: true, name: true, stage: true, lastInteractionAt: true, createdAt: true },
      orderBy: { updatedAt: "desc" },
      take: 200
    });

    const eligible: string[] = [];
    const rows: { id: string; name: string; stage: string; eligible: boolean }[] = [];

    for (const lead of leads) {
      const stale = lead.lastInteractionAt
        ? lead.lastInteractionAt < cutoff
        : lead.createdAt < cutoff;

      const hadD1 = await this.prisma.leadHistory.findFirst({
        where: { tenantId, leadId: lead.id, kind: "followup_d1_sent" }
      });

      const recentD7 = await this.prisma.leadHistory.findFirst({
        where: {
          tenantId,
          leadId: lead.id,
          kind: "followup_d7_sent",
          createdAt: { gte: cutoff }
        }
      });

      const isEligible = stale && !!hadD1 && !recentD7;
      rows.push({ id: lead.id, name: lead.name, stage: lead.stage, eligible: isEligible });
      if (isEligible) eligible.push(lead.id);
    }

    return { tenantId, scanned: leads.length, eligible: eligible.length, leadIds: eligible, leads: rows };
  }

  async execute(tenantId: string, leadId: string) {
    const automation = await this.ensureAutomationRecord(tenantId);

    if (!(await this.tenantSettings.canExecuteFollowupD7(tenantId))) {
      return this.prisma.automationRun.create({
        data: {
          tenantId,
          automationId: automation.id,
          status: "succeeded",
          trigger: FOLLOWUP_D7_PLAYBOOK,
          input: { leadId },
          output: { skipped: true, reason: "followup_d7_disabled" },
          finishedAt: new Date()
        }
      });
    }

    const days = this.afterDays();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const recentD7 = await this.prisma.leadHistory.findFirst({
      where: { tenantId, leadId, kind: "followup_d7_sent", createdAt: { gte: cutoff } }
    });
    if (recentD7) {
      return this.prisma.automationRun.create({
        data: {
          tenantId,
          automationId: automation.id,
          status: "succeeded",
          trigger: FOLLOWUP_D7_PLAYBOOK,
          input: { leadId },
          output: { skipped: true, reason: "followup_d7_sent_recently" },
          finishedAt: new Date()
        }
      });
    }

    const run = await this.prisma.automationRun.create({
      data: {
        tenantId,
        automationId: automation.id,
        status: "running",
        trigger: FOLLOWUP_D7_PLAYBOOK,
        input: { leadId }
      }
    });

    const runStep = async <T>(stepKey: string, fn: () => Promise<T>): Promise<T> => {
      const step = await this.prisma.automationStepRun.create({
        data: { tenantId, runId: run.id, stepKey, status: "running" }
      });
      try {
        const output = await fn();
        await this.prisma.automationStepRun.update({
          where: { id: step.id },
          data: { status: "succeeded", output: output as object, finishedAt: new Date() }
        });
        return output;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.prisma.automationStepRun.update({
          where: { id: step.id },
          data: { status: "failed", error: { message }, finishedAt: new Date() }
        });
        throw err;
      }
    };

    try {
      const lead = await runStep("load_lead", async () => {
        const row = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId } });
        if (!row) throw new Error("Lead nao encontrado");
        if (row.stage === LeadStage.won || row.stage === LeadStage.lost) {
          throw new Error("Lead encerrado");
        }
        return row;
      });

      const firstName = lead.name.split(/[\s-]/)[0] || lead.name;
      const messageBody = `Ola ${firstName}! Ainda podemos ajudar com seu projeto? Temos condicoes especiais esta semana — me avise se quiser retomar.`;

      const { messageId } = await runStep("send_whatsapp", async () => {
        let conversation = await this.prisma.conversation.findFirst({ where: { tenantId, leadId } });
        if (!conversation) {
          conversation = await this.prisma.conversation.create({
            data: {
              tenantId,
              leadId,
              channel: "whatsapp",
              isAiAssisted: true,
              externalRef: lead.phone ? digitsToWhatsAppJid(lead.phone) : null
            }
          });
        }

        const message = await this.prisma.message.create({
          data: {
            tenantId,
            conversationId: conversation.id,
            direction: "outbound",
            body: messageBody,
            metadata: { source: FOLLOWUP_D7_PLAYBOOK, automationRunId: run.id }
          }
        });

        if (lead.phone) {
          await this.whatsapp.sendTemplateMessage({
            tenantId,
            to: lead.phone,
            templateName: "followup_d7",
            body: messageBody
          });
        }

        const now = new Date();
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: now,
            updatedAt: now,
            ...conversationStateFromDirection("outbound")
          }
        });
        return { messageId: message.id };
      });

      await runStep("notify_in_app", () =>
        this.prisma.notification.create({
          data: {
            tenantId,
            channel: "in_app",
            status: "sent",
            subject: "Reativacao D+7 enviada",
            body: `Mensagem de reativacao para ${lead.name}`,
            sentAt: new Date(),
            payload: { leadId, messageId, playbook: FOLLOWUP_D7_PLAYBOOK }
          }
        })
      );

      await runStep("record_history", async () => {
        await this.prisma.leadHistory.create({
          data: {
            tenantId,
            leadId,
            kind: "followup_d7_sent",
            payload: { automationRunId: run.id, messageId }
          }
        });
        await this.prisma.lead.update({
          where: { id: leadId },
          data: { lastInteractionAt: new Date() }
        });
        return { recorded: true };
      });

      return this.prisma.automationRun.update({
        where: { id: run.id },
        data: { status: "succeeded", finishedAt: new Date(), output: { leadId, messageId } }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.automationRun.update({
        where: { id: run.id },
        data: { status: "failed", finishedAt: new Date(), error: { message } }
      });
      throw err;
    }
  }

  private async ensureAutomationRecord(tenantId: string) {
    const existing = await this.prisma.automation.findFirst({
      where: { tenantId, name: "Reativacao D+7", status: "active" }
    });
    if (existing) return existing;
    return this.prisma.automation.create({
      data: {
        tenantId,
        name: "Reativacao D+7",
        triggerType: "schedule",
        status: "active",
        config: {
          playbook: FOLLOWUP_D7_PLAYBOOK,
          afterDays: this.afterDays(),
          cron: this.config.get<string>("FOLLOWUP_D7_CRON", "0 9 * * *")
        }
      }
    });
  }
}
