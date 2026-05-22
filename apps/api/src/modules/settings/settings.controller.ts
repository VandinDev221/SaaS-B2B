import { Body, Controller, Get, Put } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { IsBoolean, IsOptional } from "class-validator";
import { Roles } from "../../common/decorators/roles.decorator";
import { TenantContext } from "../../common/decorators/tenant-context.decorator";
import { AiKnowledgeService } from "../ai/ai-knowledge.service";
import {
  AutomationSettingsDto,
  AutomationSettingsService
} from "./automation-settings.service";

class UpdateAutomationSettingsDto {
  @IsOptional()
  @IsBoolean()
  automationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  followupD1Enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  followupD1ScheduleOnInbound?: boolean;

  @IsOptional()
  @IsBoolean()
  followupD1ScanEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  followupD7Enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  billingRecoveryEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  postSaleEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoCreateQuoteFromChat?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSendQuotePdf?: boolean;
}

@Controller("settings")
export class SettingsController {
  constructor(
    private readonly automationSettings: AutomationSettingsService,
    private readonly aiKnowledge: AiKnowledgeService
  ) {}

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent, UserRole.viewer)
  @Get("automation")
  async getAutomation(@TenantContext() ctx: { tenantId: string }) {
    const automation = await this.automationSettings.get(ctx.tenantId);
    const ai = await this.aiKnowledge.get(ctx.tenantId);
    return {
      automation,
      ai: {
        autoCreateQuoteFromChat: ai.autoCreateQuoteFromChat,
        autoSendQuotePdf: ai.autoSendQuotePdf
      }
    };
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Put("automation")
  async updateAutomation(
    @TenantContext() ctx: { tenantId: string },
    @Body() body: UpdateAutomationSettingsDto
  ) {
    const { autoCreateQuoteFromChat, autoSendQuotePdf, ...automationFields } = body;

    const automation = await this.automationSettings.upsert(
      ctx.tenantId,
      automationFields as Partial<AutomationSettingsDto>
    );

    if (autoCreateQuoteFromChat !== undefined || autoSendQuotePdf !== undefined) {
      await this.aiKnowledge.upsert(ctx.tenantId, {
        ...(autoCreateQuoteFromChat !== undefined ? { autoCreateQuoteFromChat } : {}),
        ...(autoSendQuotePdf !== undefined ? { autoSendQuotePdf } : {})
      });
    }

    const ai = await this.aiKnowledge.get(ctx.tenantId);
    return {
      automation: {
        automationsEnabled: automation.automationsEnabled,
        followupD1Enabled: automation.followupD1Enabled,
        followupD1ScheduleOnInbound: automation.followupD1ScheduleOnInbound,
        followupD1ScanEnabled: automation.followupD1ScanEnabled,
        followupD7Enabled: automation.followupD7Enabled,
        billingRecoveryEnabled: automation.billingRecoveryEnabled,
        postSaleEnabled: automation.postSaleEnabled
      },
      ai: {
        autoCreateQuoteFromChat: ai.autoCreateQuoteFromChat,
        autoSendQuotePdf: ai.autoSendQuotePdf
      }
    };
  }
}
