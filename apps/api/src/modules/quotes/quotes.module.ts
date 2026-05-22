import { Module } from "@nestjs/common";
import { AutomationModule } from "../automation/automation.module";
import { AiModule } from "../ai/ai.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { QuoteDeliveryService } from "./quote-delivery.service";
import { QuoteFromChatService } from "./quote-from-chat.service";
import { QuotePdfService } from "./quote-pdf.service";
import { QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  imports: [AutomationModule, IntegrationsModule, AiModule],
  controllers: [QuotesController],
  providers: [
    QuotesService,
    QuotePdfService,
    QuoteDeliveryService,
    QuoteFromChatService,
    PrismaService
  ],
  exports: [QuoteFromChatService, QuoteDeliveryService]
})
export class QuotesModule {}
