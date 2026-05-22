import { Controller, Get, Param, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { TenantContext, TenantRequestContext } from "../../common/decorators/tenant-context.decorator";
import { AutomationService } from "./automation.service";
import { FollowupD1Service } from "./followup-d1.service";
import { FollowupD7Service } from "./followup-d7.service";

@Controller("automation")
export class AutomationController {
  constructor(
    private readonly automation: AutomationService,
    private readonly followupD1: FollowupD1Service,
    private readonly followupD7: FollowupD7Service
  ) {}

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Get("followup-d1/preview")
  preview(@TenantContext() ctx: TenantRequestContext) {
    return this.followupD1.scanTenant(ctx.tenantId);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Post("followup-d1/scan")
  async scan(@TenantContext() ctx: TenantRequestContext) {
    const preview = await this.followupD1.scanTenant(ctx.tenantId);
    const job = await this.automation.triggerFollowupD1Scan();
    return { preview, jobId: job.id };
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Post("followup-d1/leads/:leadId/run")
  async runLead(
    @TenantContext() ctx: TenantRequestContext,
    @Param("leadId") leadId: string
  ) {
    const result = await this.followupD1.execute(ctx.tenantId, leadId);
    return { leadId, runId: result.id, status: result.status };
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Get("followup-d7/preview")
  previewD7(@TenantContext() ctx: TenantRequestContext) {
    return this.followupD7.scanTenant(ctx.tenantId);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Post("followup-d7/scan")
  async scanD7(@TenantContext() ctx: TenantRequestContext) {
    const preview = await this.followupD7.scanTenant(ctx.tenantId);
    const job = await this.automation.triggerFollowupD7Scan();
    return { preview, jobId: job.id };
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Post("followup-d7/leads/:leadId/run")
  async runLeadD7(
    @TenantContext() ctx: TenantRequestContext,
    @Param("leadId") leadId: string
  ) {
    const result = await this.followupD7.execute(ctx.tenantId, leadId);
    return { leadId, runId: result.id, status: result.status };
  }
}
