import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";
import { TenantContext, TenantRequestContext } from "../../common/decorators/tenant-context.decorator";
import { AlertsService } from "./alerts.service";

class CreateAlertRuleDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  severity?: "info" | "warning" | "critical";

  @IsObject()
  condition!: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  channels?: ("in_app" | "email" | "whatsapp" | "webhook")[];

  @IsOptional()
  @IsInt()
  @Min(0)
  throttleMs?: number;
}

class UpdateAlertRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  severity?: "info" | "warning" | "critical";

  @IsOptional()
  @IsObject()
  condition?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  channels?: ("in_app" | "email" | "whatsapp" | "webhook")[];

  @IsOptional()
  @IsInt()
  @Min(0)
  throttleMs?: number;
}

@Controller("operations/alerts")
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get("rules")
  listRules(@TenantContext() ctx: TenantRequestContext) {
    return this.alerts.listRules(ctx.tenantId);
  }

  @Post("rules")
  createRule(@TenantContext() ctx: TenantRequestContext, @Body() body: CreateAlertRuleDto) {
    return this.alerts.createRule(ctx.tenantId, body as any);
  }

  @Patch("rules/:id")
  updateRule(
    @TenantContext() ctx: TenantRequestContext,
    @Param("id") id: string,
    @Body() body: UpdateAlertRuleDto
  ) {
    return this.alerts.updateRule(ctx.tenantId, id, body as any);
  }

  @Delete("rules/:id")
  deleteRule(@TenantContext() ctx: TenantRequestContext, @Param("id") id: string) {
    return this.alerts.deleteRule(ctx.tenantId, id);
  }

  @Get("incidents")
  listIncidents(
    @TenantContext() ctx: TenantRequestContext,
    @Query("status") status?: string,
    @Query("limit") limit?: string
  ) {
    return this.alerts.listIncidents(ctx.tenantId, {
      status,
      limit: limit ? Number(limit) : undefined
    });
  }

  @Post("incidents/:id/ack")
  ack(@TenantContext() ctx: TenantRequestContext, @Param("id") id: string) {
    return this.alerts.ackIncident(ctx.tenantId, id);
  }

  @Post("incidents/:id/resolve")
  resolve(@TenantContext() ctx: TenantRequestContext, @Param("id") id: string) {
    return this.alerts.resolveIncident(ctx.tenantId, id);
  }

  @Post("incidents/test")
  async createTestIncident(
    @TenantContext() ctx: TenantRequestContext,
    @Body() body: { title?: string }
  ) {
    let rule = await this.alerts.listRules(ctx.tenantId).then((r) => r[0]);
    if (!rule) {
      rule = await this.alerts.createRule(ctx.tenantId, {
        name: "Incidentes manuais",
        condition: { type: "manual" },
        severity: "info",
        channels: ["in_app"]
      });
    }
    return this.alerts.emitIncident(ctx.tenantId, {
      ruleId: rule.id,
      fingerprintKey: `manual:${Date.now()}`,
      severity: "info",
      title: body?.title || "Incidente de teste",
      payload: { source: "manual" }
    });
  }
}

