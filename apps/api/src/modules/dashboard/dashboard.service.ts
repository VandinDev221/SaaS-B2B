import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(tenantId: string) {
    const [
      leads,
      won,
      lost,
      openQuotes,
      revenue,
      pendingPayments,
      openIncidents,
      conversations,
      staleLeads
    ] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId } }),
      this.prisma.lead.count({ where: { tenantId, stage: "won" } }),
      this.prisma.lead.count({ where: { tenantId, stage: "lost" } }),
      this.prisma.quote.count({ where: { tenantId, status: { in: ["sent", "draft"] } } }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { tenantId, status: "paid" }
      }),
      this.prisma.payment.count({ where: { tenantId, status: { in: ["pending", "overdue"] } } }),
      this.prisma.alertIncident.count({ where: { tenantId, status: "open" } }),
      this.prisma.conversation.count({ where: { tenantId } }),
      this.prisma.lead.count({
        where: {
          tenantId,
          stage: { notIn: ["won", "lost"] },
          OR: [
            { lastInteractionAt: null },
            { lastInteractionAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
          ]
        }
      })
    ]);

    const channelGroups = await this.prisma.lead.groupBy({
      by: ["source"],
      where: { tenantId },
      _count: { _all: true }
    });

    const stageGroups = await this.prisma.lead.groupBy({
      by: ["stage"],
      where: { tenantId },
      _count: { _all: true }
    });

    const stageLabels: Record<string, string> = {
      new: "Novo",
      qualified: "Qualificado",
      proposal_sent: "Proposta",
      negotiation: "Negociacao",
      won: "Ganho",
      lost: "Perdido"
    };

    const conversionRate = leads > 0 ? Math.round((won / leads) * 1000) / 10 : 0;

    return {
      leads,
      won,
      lost,
      openQuotes,
      revenue: Number(revenue._sum.amount ?? 0),
      pendingPayments,
      openIncidents,
      conversations,
      staleLeads,
      conversionRate,
      channels: channelGroups.map((g) => ({
        source: g.source || "outros",
        count: g._count._all
      })),
      pipeline: stageGroups.map((g) => ({
        stage: g.stage,
        label: stageLabels[g.stage] ?? g.stage,
        count: g._count._all
      }))
    };
  }
}
