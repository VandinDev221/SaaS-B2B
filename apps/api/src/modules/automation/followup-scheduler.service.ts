import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LeadStage } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AutomationSettingsService } from "../settings/automation-settings.service";
import { AutomationService } from "./automation.service";

@Injectable()
export class FollowupSchedulerService {
  private readonly logger = new Logger(FollowupSchedulerService.name);

  constructor(
    private readonly automation: AutomationService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tenantSettings: AutomationSettingsService
  ) {}

  private delayMs(): number {
    const hours = Number(this.config.get<string>("FOLLOWUP_D1_AFTER_HOURS", "24"));
    return hours * 60 * 60 * 1000;
  }

  async scheduleD1(tenantId: string, leadId: string) {
    if (!this.automation.isEnabled) return null;
    if (!(await this.tenantSettings.canScheduleFollowupD1(tenantId))) return null;

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      select: { stage: true }
    });
    if (!lead) return null;

    if (lead.stage === LeadStage.won || lead.stage === LeadStage.lost) {
      await this.cancelD1(tenantId, leadId);
      return null;
    }

    const job = await this.automation.enqueueFollowupD1Scheduled(tenantId, leadId, this.delayMs());
    this.logger.log(`scheduleD1 tenant=${tenantId} lead=${leadId} delayMs=${this.delayMs()}`);
    return job;
  }

  async cancelD1(tenantId: string, leadId: string) {
    return this.automation.removeScheduledFollowupD1(tenantId, leadId);
  }
}
