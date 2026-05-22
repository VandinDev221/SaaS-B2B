import { Module } from "@nestjs/common";
import { EvolutionApiClient } from "./evolution-api.client";
import { MercadoPagoClient } from "./mercado-pago.client";
import { WhatsappAdapterService } from "./whatsapp-adapter.service";
import { WhatsappOutboundQueue } from "./whatsapp-outbound.queue";

@Module({
  providers: [EvolutionApiClient, MercadoPagoClient, WhatsappAdapterService, WhatsappOutboundQueue],
  exports: [EvolutionApiClient, MercadoPagoClient, WhatsappAdapterService, WhatsappOutboundQueue]
})
export class IntegrationsModule {}
