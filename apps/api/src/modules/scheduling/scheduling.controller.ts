import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { TenantContext } from "../../common/decorators/tenant-context.decorator";
import { SchedulingService } from "./scheduling.service";

@Controller("scheduling")
export class SchedulingController {
  constructor(private readonly service: SchedulingService) {}

  @Get("appointments")
  list(
    @TenantContext() ctx: { tenantId: string },
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.service.list(
      ctx.tenantId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined
    );
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Post("appointments")
  create(@TenantContext() ctx: { tenantId: string }, @Body() body: Record<string, unknown>) {
    return this.service.create(ctx.tenantId, body as never);
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager, UserRole.agent)
  @Post("appointments/:id/cancel")
  cancel(@TenantContext() ctx: { tenantId: string }, @Param("id") id: string) {
    return this.service.cancel(ctx.tenantId, id);
  }
}
