import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { TenantContext } from "../../common/decorators/tenant-context.decorator";
import { PostSaleService } from "./postsale.service";

@Controller("postsale")
export class PostSaleController {
  constructor(private readonly service: PostSaleService) {}

  @Get("campaigns")
  campaigns(@TenantContext() ctx: { tenantId: string }) {
    return this.service.listCampaigns(ctx.tenantId);
  }

  @Get("runs")
  runs(@TenantContext() ctx: { tenantId: string }) {
    return this.service.listRuns(ctx.tenantId);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Post("campaigns")
  create(@TenantContext() ctx: { tenantId: string }, @Body() body: { name: string; type: string }) {
    return this.service.createCampaign(ctx.tenantId, body);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Post("campaigns/:id/schedule")
  schedule(@TenantContext() ctx: { tenantId: string }, @Param("id") id: string) {
    return this.service.scheduleRuns(ctx.tenantId, id);
  }
}
