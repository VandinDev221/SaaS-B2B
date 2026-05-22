import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PostSaleService {
  constructor(private readonly prisma: PrismaService) {}

  listCampaigns(tenantId: string) {
    return this.prisma.postSaleCampaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { runs: { take: 5, orderBy: { scheduledAt: "desc" } } }
    });
  }

  async createCampaign(
    tenantId: string,
    input: { name: string; type: string; config?: Prisma.InputJsonValue }
  ) {
    return this.prisma.postSaleCampaign.create({
      data: {
        tenantId,
        name: input.name,
        type: input.type,
        config: input.config ?? {}
      }
    });
  }

  async scheduleRuns(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.postSaleCampaign.findFirst({
      where: { id: campaignId, tenantId }
    });
    if (!campaign) return { scheduled: 0 };

    const leads =
      campaign.type === "reactivation"
        ? await this.prisma.lead.findMany({ where: { tenantId, stage: "lost" }, take: 20 })
        : await this.prisma.lead.findMany({ where: { tenantId, stage: "won" }, take: 20 });

    const days = [7, 14, 30];
    let count = 0;
    for (const lead of leads) {
      for (const day of days) {
        await this.prisma.postSaleRun.create({
          data: {
            tenantId,
            campaignId,
            leadId: lead.id,
            scheduledAt: new Date(Date.now() + day * 24 * 60 * 60 * 1000),
            status: "pending"
          }
        });
        count++;
      }
    }
    return { scheduled: count, campaignId };
  }

  listRuns(tenantId: string) {
    return this.prisma.postSaleRun.findMany({
      where: { tenantId },
      orderBy: { scheduledAt: "asc" },
      take: 50,
      include: { campaign: true, lead: { select: { name: true } } }
    });
  }
}
