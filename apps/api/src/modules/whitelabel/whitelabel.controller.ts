import { Body, Controller, Get, Put } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { TenantContext } from "../../common/decorators/tenant-context.decorator";
import { WhitelabelService } from "./whitelabel.service";

@Controller("whitelabel")
export class WhitelabelController {
  constructor(private readonly service: WhitelabelService) {}

  @Get("branding")
  get(@TenantContext() ctx: { tenantId: string }) {
    return this.service.getBranding(ctx.tenantId);
  }

  @Roles(UserRole.owner, UserRole.admin)
  @Put("branding")
  upsert(@TenantContext() ctx: { tenantId: string }, @Body() body: Record<string, unknown>) {
    return this.service.upsertBranding(ctx.tenantId, body as never);
  }
}
