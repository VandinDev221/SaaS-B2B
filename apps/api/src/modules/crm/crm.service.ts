import { Injectable, NotFoundException } from "@nestjs/common";
import { LeadStage } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { FollowupSchedulerService } from "../automation/followup-scheduler.service";

export type UpdateLeadInput = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  score?: number;
};

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followupScheduler: FollowupSchedulerService
  ) {}

  async getLead(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        pipelineStage: { select: { id: true, name: true, color: true, order: true } },
        owner: { select: { id: true, fullName: true } },
        conversations: { select: { id: true, channel: true, updatedAt: true } }
      }
    });
    if (!lead) throw new NotFoundException("Lead nao encontrado");
    return lead;
  }

  getLeadTimeline(tenantId: string, leadId: string) {
    return this.prisma.leadHistory.findMany({
      where: { tenantId, leadId },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async importLeadsFromCsv(tenantId: string, csvText: string) {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return { imported: 0, errors: ["CSV vazio ou sem dados"] };

    const header = lines[0].toLowerCase().split(/[,;]/).map((h) => h.trim());
    const nameIdx = header.findIndex((h) => h === "nome" || h === "name");
    const phoneIdx = header.findIndex((h) => h === "telefone" || h === "phone");
    const emailIdx = header.findIndex((h) => h === "email");
    const notesIdx = header.findIndex((h) => h === "notas" || h === "notes");

    if (nameIdx < 0) return { imported: 0, errors: ["Coluna 'nome' obrigatoria"] };

    const company = await this.prisma.company.findFirst({ where: { tenantId } });
    if (!company) return { imported: 0, errors: ["Empresa padrao nao encontrada no tenant"] };

    let imported = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ""));
      const name = cols[nameIdx];
      if (!name) {
        errors.push(`Linha ${i + 1}: nome vazio`);
        continue;
      }

      await this.prisma.lead.create({
        data: {
          tenantId,
          companyId: company.id,
          name,
          phone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
          email: emailIdx >= 0 ? cols[emailIdx] || null : null,
          notes: notesIdx >= 0 ? cols[notesIdx] || null : null,
          stage: "new",
          source: "csv_import",
          tags: []
        }
      });
      imported++;
    }

    return { imported, errors };
  }

  listLeads(tenantId: string) {
    return this.prisma.lead.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        pipelineStage: { select: { id: true, name: true, color: true, order: true } },
        owner: { select: { id: true, fullName: true } }
      }
    });
  }

  async getPipelineBoard(tenantId: string) {
    let pipeline = await this.prisma.pipeline.findFirst({
      where: { tenantId, isDefault: true },
      include: { stages: { orderBy: { order: "asc" } } }
    });

    if (!pipeline) {
      pipeline = await this.prisma.pipeline.create({
        data: {
          tenantId,
          name: "Comercial",
          isDefault: true,
          stages: {
            create: [
              { tenantId, name: "Novo", order: 0, color: "#3b82f6" },
              { tenantId, name: "Qualificado", order: 1, color: "#8b5cf6" },
              { tenantId, name: "Proposta", order: 2, color: "#f59e0b" },
              { tenantId, name: "Negociacao", order: 3, color: "#f97316" },
              { tenantId, name: "Ganho", order: 4, color: "#22c55e", isWon: true },
              { tenantId, name: "Perdido", order: 5, color: "#ef4444", isLost: true }
            ]
          }
        },
        include: { stages: { orderBy: { order: "asc" } } }
      });
    }

    const leads = await this.prisma.lead.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: {
        owner: { select: { id: true, fullName: true } }
      }
    });

    const columns = pipeline.stages.map((stage) => ({
      stage,
      leads: leads.filter((l) => l.stageId === stage.id || (!l.stageId && this.stageEnumForOrder(stage.order) === l.stage))
    }));

    return { pipeline, columns, leads };
  }

  private stageEnumForOrder(order: number): LeadStage {
    const map: LeadStage[] = ["new", "qualified", "proposal_sent", "negotiation", "won", "lost"];
    return map[order] ?? "new";
  }

  async updateLeadStage(tenantId: string, leadId: string, stage: LeadStage, stageId?: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException("Lead nao encontrado");

    let resolvedStageId = stageId;
    if (!resolvedStageId) {
      const pipeline = await this.prisma.pipeline.findFirst({
        where: { tenantId, isDefault: true },
        include: { stages: true }
      });
      const match = pipeline?.stages.find((s) => {
        if (stage === "won") return s.isWon;
        if (stage === "lost") return s.isLost;
        return this.stageEnumForOrder(s.order) === stage;
      });
      resolvedStageId = match?.id;
    }

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        stage,
        stageId: resolvedStageId,
        lastInteractionAt: new Date()
      }
    });

    await this.prisma.leadHistory.create({
      data: {
        tenantId,
        leadId,
        kind: "stage_changed",
        payload: { from: lead.stage, to: stage }
      }
    });

    if (stage === LeadStage.won || stage === LeadStage.lost) {
      await this.followupScheduler.cancelD1(tenantId, leadId);
    } else {
      await this.followupScheduler.scheduleD1(tenantId, leadId);
    }

    return updated;
  }

  async updateLead(tenantId: string, leadId: string, input: UpdateLeadInput) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException("Lead nao encontrado");

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
        ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
        ...(input.score !== undefined ? { score: input.score } : {}),
        updatedAt: new Date()
      }
    });

    await this.prisma.leadHistory.create({
      data: {
        tenantId,
        leadId,
        kind: "lead_updated",
        payload: {
          fields: Object.keys(input),
          name: input.name ?? lead.name
        }
      }
    });

    return updated;
  }

  async deleteLead(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException("Lead nao encontrado");

    await this.followupScheduler.cancelD1(tenantId, leadId);

    await this.prisma.lead.delete({ where: { id: leadId } });

    return { ok: true, deletedLeadId: leadId };
  }
}
