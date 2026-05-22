import { Injectable, Logger } from "@nestjs/common";
import { LeadStage } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { getCatalog } from "../quotes/catalog";

type TemplateDefinition = {
  version?: number;
  pipeline?: { stages?: { name: string; color: string; order: number; isWon?: boolean; isLost?: boolean }[] };
  automations?: { name: string; type: string }[];
  catalogNiche?: string;
  postSale?: { name: string; type: string; days?: number[] };
};

const BUILTIN_DEFINITIONS: Record<string, TemplateDefinition> = {
  "cftv-pipeline-pro": {
    pipeline: {
      stages: [
        { name: "Lead novo", color: "#3b82f6", order: 0 },
        { name: "Visita tecnica", color: "#8b5cf6", order: 1 },
        { name: "Proposta", color: "#f59e0b", order: 2 },
        { name: "Instalacao", color: "#22c55e", order: 3, isWon: true },
        { name: "Perdido", color: "#ef4444", order: 4, isLost: true }
      ]
    },
    catalogNiche: "cftv",
    automations: [{ name: "Follow-up D+1 CFTV", type: "followup_d1" }]
  },
  "oficina-followup": {
    catalogNiche: "oficina",
    automations: [{ name: "Follow-up D+1 Oficina", type: "followup_d1" }],
    postSale: { name: "Reativacao oficina", type: "reactivation", days: [7, 14, 30] }
  },
  "clinica-pos-venda": {
    catalogNiche: "clinica",
    postSale: { name: "Pos-consulta clinica", type: "retention", days: [7, 14, 30] },
    automations: [{ name: "Follow-up D+1 Clinica", type: "followup_d1" }]
  },
  "barbearia-growth": {
    catalogNiche: "barbearia",
    automations: [{ name: "Follow-up D+1 Barbearia", type: "followup_d1" }],
    postSale: { name: "Retorno barbearia", type: "retention", days: [14, 30] }
  },
  "solar-proposta": {
    catalogNiche: "solar",
    automations: [{ name: "Follow-up D+1 Solar", type: "followup_d1" }]
  },
  "delivery-reativacao": {
    catalogNiche: "delivery",
    postSale: { name: "Reativacao delivery", type: "reactivation", days: [7, 14, 30] }
  }
};

@Injectable()
export class MarketplaceProvisionService {
  private readonly logger = new Logger(MarketplaceProvisionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async provision(tenantId: string, templateSlug: string) {
    const template = await this.prisma.marketplaceTemplate.findUnique({
      where: { slug: templateSlug }
    });
    if (!template) return { ok: false, reason: "template_not_found" };

    const def =
      (template.definition as TemplateDefinition) ??
      BUILTIN_DEFINITIONS[templateSlug] ??
      {};

    const builtin = BUILTIN_DEFINITIONS[templateSlug];
    const merged: TemplateDefinition = { ...builtin, ...def };

    const results: string[] = [];

    if (merged.pipeline?.stages?.length) {
      await this.provisionPipeline(tenantId, merged.pipeline.stages);
      results.push("pipeline");
    }

    if (merged.catalogNiche) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { niche: merged.catalogNiche }
      });
      const items = getCatalog(merged.catalogNiche);
      await this.prisma.tenantAiKnowledge.upsert({
        where: { tenantId },
        create: {
          tenantId,
          businessDescription: `Negocio segmento ${merged.catalogNiche} — catalogo com ${items.length} itens.`,
          productsAndServices: items.map((i) => `${i.name}: R$ ${i.unitPrice}`).join("\n"),
          quoteInstructions: "Analise o pedido antes de enviar orcamento.",
          toneOfVoice: "profissional e cordial"
        },
        update: {
          productsAndServices: items.map((i) => `${i.name}: R$ ${i.unitPrice}`).join("\n")
        }
      });
      results.push("catalog", "ai_knowledge");
    }

    if (merged.automations?.length) {
      for (const a of merged.automations) {
        const existing = await this.prisma.automation.findFirst({
          where: { tenantId, name: a.name }
        });
        if (!existing) {
          await this.prisma.automation.create({
            data: {
              tenantId,
              name: a.name,
              triggerType: a.type,
              status: "active",
              config: { playbook: a.type }
            }
          });
        }
      }
      results.push("automations");
    }

    if (merged.postSale) {
      const existing = await this.prisma.postSaleCampaign.findFirst({
        where: { tenantId, name: merged.postSale.name }
      });
      if (!existing) {
        await this.prisma.postSaleCampaign.create({
          data: {
            tenantId,
            name: merged.postSale.name,
            type: merged.postSale.type,
            config: { days: merged.postSale.days ?? [7, 14, 30] }
          }
        });
      }
      results.push("postsale");
    }

    this.logger.log(`Marketplace ${templateSlug} provisionado tenant=${tenantId}: ${results.join(",")}`);
    return { ok: true, provisioned: results, catalogItems: merged.catalogNiche ? getCatalog(merged.catalogNiche).length : 0 };
  }

  previewDefinition(slug: string) {
    const builtin = BUILTIN_DEFINITIONS[slug];
    if (!builtin) return { slug, available: false };
    const items = builtin.catalogNiche ? getCatalog(builtin.catalogNiche) : [];
    return {
      slug,
      available: true,
      definition: builtin,
      catalogPreview: items.slice(0, 8)
    };
  }

  private async provisionPipeline(
    tenantId: string,
    stages: NonNullable<TemplateDefinition["pipeline"]>["stages"]
  ) {
    if (!stages?.length) return;

    let pipeline = await this.prisma.pipeline.findFirst({
      where: { tenantId, isDefault: true }
    });

    if (!pipeline) {
      pipeline = await this.prisma.pipeline.create({
        data: { tenantId, name: "Comercial", isDefault: true }
      });
    }

    for (const s of stages) {
      const existing = await this.prisma.pipelineStage.findFirst({
        where: { tenantId, pipelineId: pipeline.id, order: s.order }
      });
      if (!existing) {
        await this.prisma.pipelineStage.create({
          data: {
            tenantId,
            pipelineId: pipeline.id,
            name: s.name,
            color: s.color,
            order: s.order,
            isWon: s.isWon ?? false,
            isLost: s.isLost ?? false
          }
        });
      }
    }
  }
}
