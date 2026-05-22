import { Controller, Get } from "@nestjs/common";
import { TenantContext } from "../../common/decorators/tenant-context.decorator";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("kpis")
  getKpis(@TenantContext() ctx: { tenantId: string }) {
    return this.dashboardService.getKpis(ctx.tenantId);
  }
}
