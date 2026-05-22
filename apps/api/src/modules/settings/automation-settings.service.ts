import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export type AutomationSettingsDto = {
  automationsEnabled: boolean;
  followupD1Enabled: boolean;
  followupD1ScheduleOnInbound: boolean;
  followupD1ScanEnabled: boolean;
  followupD7Enabled: boolean;
  billingRecoveryEnabled: boolean;
  postSaleEnabled: boolean;
};

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettingsDto = {
  automationsEnabled: true,
  followupD1Enabled: true,
  followupD1ScheduleOnInbound: false,
  followupD1ScanEnabled: false,
  followupD7Enabled: false,
  billingRecoveryEnabled: false,
  postSaleEnabled: false
};

@Injectable()
export class AutomationSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string): Promise<AutomationSettingsDto> {
    const row = await this.prisma.tenantAutomationSettings.findUnique({
      where: { tenantId }
    });
    if (!row) return { ...DEFAULT_AUTOMATION_SETTINGS };
    return {
      automationsEnabled: row.automationsEnabled,
      followupD1Enabled: row.followupD1Enabled,
      followupD1ScheduleOnInbound: row.followupD1ScheduleOnInbound,
      followupD1ScanEnabled: row.followupD1ScanEnabled,
      followupD7Enabled: row.followupD7Enabled,
      billingRecoveryEnabled: row.billingRecoveryEnabled,
      postSaleEnabled: row.postSaleEnabled
    };
  }

  async upsert(tenantId: string, input: Partial<AutomationSettingsDto>) {
    const current = await this.get(tenantId);
    const merged = { ...current, ...input };
    return this.prisma.tenantAutomationSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...merged },
      update: merged
    });
  }

  async canScheduleFollowupD1(tenantId: string) {
    const s = await this.get(tenantId);
    return s.automationsEnabled && s.followupD1Enabled && s.followupD1ScheduleOnInbound;
  }

  async canScanFollowupD1(tenantId: string) {
    const s = await this.get(tenantId);
    return s.automationsEnabled && s.followupD1Enabled && s.followupD1ScanEnabled;
  }

  async canExecuteFollowupD1(tenantId: string) {
    const s = await this.get(tenantId);
    return s.automationsEnabled && s.followupD1Enabled;
  }

  async canScanFollowupD7(tenantId: string) {
    const s = await this.get(tenantId);
    return s.automationsEnabled && s.followupD7Enabled;
  }

  async canExecuteFollowupD7(tenantId: string) {
    return this.canScanFollowupD7(tenantId);
  }

  async canBillingRecovery(tenantId: string) {
    const s = await this.get(tenantId);
    return s.automationsEnabled && s.billingRecoveryEnabled;
  }

  async canPostSale(tenantId: string) {
    const s = await this.get(tenantId);
    return s.automationsEnabled && s.postSaleEnabled;
  }
}
