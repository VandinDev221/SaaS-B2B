import { Module } from "@nestjs/common";
import { AutomationModule } from "../automation/automation.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { SettingsModule } from "../settings/settings.module";
import { BillingService } from "./billing.service";
import { BillingController } from "./billing.controller";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [AutomationModule, IntegrationsModule, SettingsModule],
  controllers: [BillingController],
  providers: [BillingService, PrismaService]
})
export class BillingModule {}
