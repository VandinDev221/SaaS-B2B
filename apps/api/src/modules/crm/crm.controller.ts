import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { LeadStage, UserRole } from "@prisma/client";
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { TenantContext } from "../../common/decorators/tenant-context.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { CrmService } from "./crm.service";

class UpdateStageDto {
  @IsEnum(LeadStage)
  stage!: LeadStage;

  @IsOptional()
  @IsString()
  stageId?: string;
}

class ImportLeadsDto {
  @IsString()
  @MinLength(10)
  csv!: string;
}

class UpdateLeadDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;
}

@Controller("crm")
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent, UserRole.viewer)
  @Get("leads")
  listLeads(@TenantContext() ctx: { tenantId: string }) {
    return this.crmService.listLeads(ctx.tenantId);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent, UserRole.viewer)
  @Get("leads/:id")
  getLead(@TenantContext() ctx: { tenantId: string }, @Param("id") id: string) {
    return this.crmService.getLead(ctx.tenantId, id);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent, UserRole.viewer)
  @Get("leads/:id/timeline")
  getLeadTimeline(@TenantContext() ctx: { tenantId: string }, @Param("id") id: string) {
    return this.crmService.getLeadTimeline(ctx.tenantId, id);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Post("leads/import")
  importLeads(@TenantContext() ctx: { tenantId: string }, @Body() body: ImportLeadsDto) {
    return this.crmService.importLeadsFromCsv(ctx.tenantId, body.csv);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Patch("leads/:id")
  updateLead(
    @TenantContext() ctx: { tenantId: string },
    @Param("id") id: string,
    @Body() body: UpdateLeadDto
  ) {
    return this.crmService.updateLead(ctx.tenantId, id, body);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Delete("leads/:id")
  deleteLead(@TenantContext() ctx: { tenantId: string }, @Param("id") id: string) {
    return this.crmService.deleteLead(ctx.tenantId, id);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent, UserRole.viewer)
  @Get("pipeline")
  pipeline(@TenantContext() ctx: { tenantId: string }) {
    return this.crmService.getPipelineBoard(ctx.tenantId);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Patch("leads/:id/stage")
  updateStage(
    @TenantContext() ctx: { tenantId: string },
    @Param("id") id: string,
    @Body() body: UpdateStageDto
  ) {
    return this.crmService.updateLeadStage(ctx.tenantId, id, body.stage, body.stageId);
  }
}
