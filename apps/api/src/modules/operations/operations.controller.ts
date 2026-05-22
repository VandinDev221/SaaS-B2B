import { Controller, Get } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { TenantContext, TenantRequestContext } from "../../common/decorators/tenant-context.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { AlertsService } from "./alerts.service";

@Controller("operations")
export class OperationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService
  ) {}

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Get("summary")
  async summary(@TenantContext() ctx: TenantRequestContext) {
    const tenantId = ctx.tenantId;
    const [automations, runsToday, openIncidents, pendingNotifications, inboxBacklog] =
      await Promise.all([
        this.prisma.automation.count({ where: { tenantId, status: "active" } }),
        this.prisma.automationRun.count({
          where: {
            tenantId,
            startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          }
        }),
        this.prisma.alertIncident.count({ where: { tenantId, status: "open" } }),
        this.prisma.notification.count({ where: { tenantId, status: "pending" } }),
        this.prisma.inboxEvent.count({ where: { tenantId, processedAt: null } })
      ]);

    return {
      automations,
      runsToday,
      openIncidents,
      pendingNotifications,
      inboxBacklog,
      health: "operational"
    };
  }

  @Roles(UserRole.owner, UserRole.admin, UserRole.manager)
  @Get("runs")
  listRuns(@TenantContext() ctx: TenantRequestContext) {
    return this.prisma.automationRun.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: { automation: { select: { name: true } } }
    });
  }
}
