import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const PLAN_DEFAULTS: Record<string, Record<string, boolean | number>> = {
  starter: {
    "ai.enabled": true,
    "ai.monthlyCalls": 200,
    "automation.followup": true,
    "automation.billingRecovery": false,
    "whatsapp.enabled": true,
    "crm.maxLeads": 500
  },
  pro: {
    "ai.enabled": true,
    "ai.monthlyCalls": 2000,
    "automation.followup": true,
    "automation.billingRecovery": true,
    "whatsapp.enabled": true,
    "crm.maxLeads": 5000
  },
  scale: {
    "ai.enabled": true,
    "ai.monthlyCalls": 20000,
    "automation.followup": true,
    "automation.billingRecovery": true,
    "whatsapp.enabled": true,
    "crm.maxLeads": 50000,
    "whitelabel.enabled": true
  }
};

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffective(tenantId: string): Promise<Record<string, boolean | number>> {
    const overrides = await this.prisma.entitlement.findMany({ where: { tenantId } });
    const overrideMap: Record<string, boolean | number> = {};
    for (const o of overrides) {
      const v = o.value as boolean | number;
      overrideMap[o.key] = v;
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: "active" },
      include: { plan: true },
      orderBy: { createdAt: "desc" }
    });

    const planCode = sub?.plan?.code ?? "starter";
    const base = { ...(PLAN_DEFAULTS[planCode] ?? PLAN_DEFAULTS.starter) };
    return { ...base, ...overrideMap };
  }

  async assert(tenantId: string, key: string) {
    const ent = await this.getEffective(tenantId);
    const val = ent[key];
    if (val === false || val === 0) {
      throw new ForbiddenException(`Recurso nao disponivel no seu plano: ${key}`);
    }
    return true;
  }

  async assertAiQuota(tenantId: string) {
    await this.assert(tenantId, "ai.enabled");
    const ent = await this.getEffective(tenantId);
    const limit = Number(ent["ai.monthlyCalls"] ?? 200);
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const used = await this.prisma.aiUsageLog.count({
      where: { tenantId, createdAt: { gte: start } }
    });
    if (used >= limit) {
      throw new ForbiddenException(`Cota mensal de IA atingida (${limit} chamadas)`);
    }
    return { used, limit };
  }
}
