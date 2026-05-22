import { Controller, Get, Param, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { TenantContext } from "../../common/decorators/tenant-context.decorator";
import { AiService } from "./ai.service";

@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Post("conversations/:id/summary")
  summarize(@TenantContext() ctx: { tenantId: string }, @Param("id") id: string) {
    return this.ai.summarizeConversation(ctx.tenantId, id);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Post("leads/:id/classify")
  classify(@TenantContext() ctx: { tenantId: string }, @Param("id") id: string) {
    return this.ai.classifyLead(ctx.tenantId, id);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Post("leads/:id/next-action")
  nextAction(@TenantContext() ctx: { tenantId: string }, @Param("id") id: string) {
    return this.ai.nextAction(ctx.tenantId, id);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Post("conversations/:id/draft-reply")
  draftReply(@TenantContext() ctx: { tenantId: string }, @Param("id") id: string) {
    return this.ai.draftReply(ctx.tenantId, id);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Post("quotes/generate/:leadId")
  quoteDraft(@TenantContext() ctx: { tenantId: string }, @Param("leadId") leadId: string) {
    return this.ai.generateQuoteDraft(ctx.tenantId, leadId);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Post("conversations/:id/generate-quote")
  quoteFromConversation(
    @TenantContext() ctx: { tenantId: string },
    @Param("id") id: string
  ) {
    return this.ai.generateQuoteDraftFromConversation(ctx.tenantId, id);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Get("usage")
  usage(@TenantContext() ctx: { tenantId: string }) {
    return this.ai.getUsageStats(ctx.tenantId);
  }

  @Get("status")
  status() {
    return this.ai.getStatus();
  }
}
