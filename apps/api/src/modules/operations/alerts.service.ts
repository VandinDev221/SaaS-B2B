import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type RuleInput = {
  name?: string;
  isEnabled?: boolean;
  severity?: "info" | "warning" | "critical";
  condition?: Prisma.InputJsonValue;
  channels?: ("in_app" | "email" | "whatsapp" | "webhook")[];
  throttleMs?: number;
};

type EmitIncidentInput = {
  ruleId: string;
  fingerprintKey: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description?: string;
  payload?: Prisma.InputJsonValue;
};

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2
  ) {}

  listRules(tenantId: string) {
    return this.prisma.alertRule.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" }
    });
  }

  createRule(tenantId: string, input: Required<Pick<RuleInput, "name" | "condition">> & RuleInput) {
    return this.prisma.alertRule.create({
      data: {
        tenantId,
        name: input.name,
        isEnabled: input.isEnabled ?? true,
        severity: (input.severity ?? "warning") as any,
        condition: input.condition,
        channels: (input.channels ?? []) as any,
        throttleMs: input.throttleMs ?? 300_000
      }
    });
  }

  updateRule(tenantId: string, id: string, input: RuleInput) {
    return this.prisma.alertRule.update({
      where: { id, tenantId } as any,
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
        ...(input.severity !== undefined ? { severity: input.severity as any } : {}),
        ...(input.condition !== undefined ? { condition: input.condition } : {}),
        ...(input.channels !== undefined ? { channels: input.channels as any } : {}),
        ...(input.throttleMs !== undefined ? { throttleMs: input.throttleMs } : {})
      }
    });
  }

  deleteRule(tenantId: string, id: string) {
    return this.prisma.alertRule.delete({
      where: { id, tenantId } as any
    });
  }

  listIncidents(tenantId: string, opts?: { status?: string; limit?: number }) {
    return this.prisma.alertIncident.findMany({
      where: { tenantId, ...(opts?.status ? { status: opts.status as any } : {}) },
      orderBy: { createdAt: "desc" },
      take: opts?.limit ?? 50,
      include: { notifications: { orderBy: { createdAt: "desc" }, take: 20 } }
    });
  }

  ackIncident(tenantId: string, id: string) {
    return this.prisma.alertIncident.update({
      where: { id, tenantId } as any,
      data: { status: "acknowledged" as any, acknowledgedAt: new Date() }
    });
  }

  resolveIncident(tenantId: string, id: string) {
    return this.prisma.alertIncident.update({
      where: { id, tenantId } as any,
      data: { status: "resolved" as any, resolvedAt: new Date() }
    });
  }

  async emitIncident(tenantId: string, input: EmitIncidentInput) {
    const incident = await this.prisma.alertIncident.upsert({
      where: {
        tenantId_fingerprint_ruleId: {
          tenantId,
          fingerprint: input.fingerprintKey,
          ruleId: input.ruleId
        }
      },
      create: {
        tenantId,
        ruleId: input.ruleId,
        fingerprint: input.fingerprintKey,
        status: "open" as any,
        severity: input.severity as any,
        title: input.title,
        description: input.description,
        payload: input.payload ?? {}
      },
      update: {
        updatedAt: new Date(),
        status: "open" as any,
        severity: input.severity as any,
        title: input.title,
        description: input.description,
        payload: input.payload ?? {}
      }
    });

    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        incidentId: incident.id,
        channel: "in_app" as any,
        status: "sent" as any,
        subject: input.title,
        body: input.description ?? null,
        payload: input.payload ?? {},
        sentAt: new Date()
      }
    });

    this.events.emit(`notification.${tenantId}`, {
      type: "alert",
      incidentId: incident.id,
      notificationId: notification.id,
      title: input.title,
      severity: input.severity,
      createdAt: new Date().toISOString()
    });

    const rule = await this.prisma.alertRule.findUnique({ where: { id: input.ruleId } });
    const channels = (rule?.channels ?? ["in_app"]) as string[];

    if (channels.includes("email")) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          incidentId: incident.id,
          channel: "email" as any,
          status: "pending" as any,
          subject: input.title,
          body: input.description ?? null,
          payload: { delivery: "smtp_pending", to: "owner@tenant" }
        }
      });
    }

    if (channels.includes("whatsapp")) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          incidentId: incident.id,
          channel: "whatsapp" as any,
          status: "pending" as any,
          subject: input.title,
          body: input.description ?? null,
          payload: { delivery: "whatsapp_queue" }
        }
      });
    }

    return incident;
  }
}

