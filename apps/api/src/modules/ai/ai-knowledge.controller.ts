import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { Roles } from "../../common/decorators/roles.decorator";
import { TenantContext } from "../../common/decorators/tenant-context.decorator";
import { AiKnowledgeService, DEFAULT_AI_KNOWLEDGE } from "./ai-knowledge.service";

class UpdateAiKnowledgeDto {
  @IsOptional()
  @IsString()
  businessDescription?: string;

  @IsOptional()
  @IsString()
  productsAndServices?: string;

  @IsOptional()
  @IsString()
  quoteInstructions?: string;

  @IsOptional()
  @IsString()
  toneOfVoice?: string;

  @IsOptional()
  @IsBoolean()
  autoSendQuotePdf?: boolean;

  @IsOptional()
  @IsBoolean()
  autoCreateQuoteFromChat?: boolean;
}

@Controller("ai/knowledge")
export class AiKnowledgeController {
  constructor(private readonly knowledge: AiKnowledgeService) {}

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Get()
  get(@TenantContext() ctx: { tenantId: string }) {
    return this.knowledge.get(ctx.tenantId);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Put()
  update(@TenantContext() ctx: { tenantId: string }, @Body() body: UpdateAiKnowledgeDto) {
    return this.knowledge.upsert(ctx.tenantId, body);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Post("apply-defaults")
  applyDefaults(@TenantContext() ctx: { tenantId: string }) {
    return this.knowledge.upsert(ctx.tenantId, DEFAULT_AI_KNOWLEDGE);
  }

  @Get("niches")
  listNiches() {
    return this.knowledge.listNiches();
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Post("apply-niche/:niche")
  applyNiche(@TenantContext() ctx: { tenantId: string }, @Param("niche") niche: string) {
    return this.knowledge.applyNichePack(ctx.tenantId, niche);
  }
}
