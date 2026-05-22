import { Module, forwardRef } from "@nestjs/common";
import { AutomationModule } from "../automation/automation.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { QuotesModule } from "../quotes/quotes.module";
import { EvolutionAdminController } from "./evolution-admin.controller";
import { WhatsappController } from "./whatsapp.controller";
import { WhatsappWebhookController } from "./whatsapp-webhook.controller";
import { WhatsappWebhookService } from "./whatsapp-webhook.service";
import { WhatsappService } from "./whatsapp.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [AutomationModule, IntegrationsModule, forwardRef(() => QuotesModule)],
  controllers: [WhatsappController, WhatsappWebhookController, EvolutionAdminController],
  providers: [WhatsappService, WhatsappWebhookService, PrismaService]
})
export class WhatsappModule {}
