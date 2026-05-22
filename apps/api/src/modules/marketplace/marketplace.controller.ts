import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { TenantContext } from "../../common/decorators/tenant-context.decorator";
import { MarketplaceService } from "./marketplace.service";

@Controller("marketplace")
export class MarketplaceController {
  constructor(private readonly service: MarketplaceService) {}

  @Get("templates")
  templates(@Query("niche") niche?: string) {
    return this.service.listTemplates(niche);
  }

  @Get("templates/:slug/preview")
  preview(@Param("slug") slug: string) {
    return this.service.preview(slug);
  }

  @Get("installed")
  installed(@TenantContext() ctx: { tenantId: string }) {
    return this.service.listInstalled(ctx.tenantId);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Post("install/:slug")
  install(@TenantContext() ctx: { tenantId: string }, @Param("slug") slug: string) {
    return this.service.install(ctx.tenantId, slug);
  }
}
