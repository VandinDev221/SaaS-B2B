import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "../config/env.validation";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerGuard } from "@nestjs/throttler";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { TenantGuard } from "../common/guards/tenant.guard";
import { AuthModule } from "./auth/auth.module";
import { AutomationModule } from "./automation/automation.module";
import { BillingModule } from "./billing/billing.module";
import { CrmModule } from "./crm/crm.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { ObservabilityModule } from "./observability/observability.module";
import { QuotesModule } from "./quotes/quotes.module";
import { TenancyModule } from "./tenancy/tenancy.module";
import { WhatsappModule } from "./whatsapp/whatsapp.module";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { OperationsModule } from "./operations/operations.module";
import { AiModule } from "./ai/ai.module";
import { WhitelabelModule } from "./whitelabel/whitelabel.module";
import { MarketplaceModule } from "./marketplace/marketplace.module";
import { SchedulingModule } from "./scheduling/scheduling.module";
import { PostSaleModule } from "./postsale/postsale.module";
import { PlatformModule } from "./platform/platform.module";
import { SettingsModule } from "./settings/settings.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120
      }
    ]),
    EventEmitterModule.forRoot(),
    TenancyModule,
    AuthModule,
    CrmModule,
    WhatsappModule,
    DashboardModule,
    AutomationModule,
    OperationsModule,
    IntegrationsModule,
    QuotesModule,
    BillingModule,
    AiModule,
    WhitelabelModule,
    MarketplaceModule,
    SchedulingModule,
    PostSaleModule,
    PlatformModule,
    SettingsModule,
    ObservabilityModule
  ],
  providers: [
    PrismaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard }
  ]
})
export class AppModule {}
