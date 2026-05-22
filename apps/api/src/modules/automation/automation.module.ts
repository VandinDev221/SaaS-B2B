import { Module } from "@nestjs/common";
import { IntegrationsModule } from "../integrations/integrations.module";
import { SettingsModule } from "../settings/settings.module";
import { PrismaService } from "../../prisma/prisma.service";
import { BillingRecoveryService } from "../billing/billing-recovery.service";
import { AutomationController } from "./automation.controller";
import { AutomationService } from "./automation.service";
import { FollowupD1Service } from "./followup-d1.service";
import { FollowupD7Service } from "./followup-d7.service";
import { FollowupSchedulerService } from "./followup-scheduler.service";
import { PostSaleExecutorService } from "./postsale-executor.service";

@Module({
  imports: [IntegrationsModule, SettingsModule],
  controllers: [AutomationController],
  providers: [
    PrismaService,
    FollowupD1Service,
    FollowupD7Service,
    FollowupSchedulerService,
    BillingRecoveryService,
    PostSaleExecutorService,
    AutomationService
  ],
  exports: [AutomationService, FollowupSchedulerService, BillingRecoveryService]
})
export class AutomationModule {}
