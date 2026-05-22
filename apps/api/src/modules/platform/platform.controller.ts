import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";

@Controller("platform")
export class PlatformController {
  @Public()
  @Get("services")
  services() {
    return {
      architecture: "modular-monolith",
      extractionReady: true,
      services: [
        { name: "auth-tenancy", path: "/v1/auth", boundedContext: "identity" },
        { name: "crm", path: "/v1/crm", boundedContext: "sales" },
        { name: "whatsapp-hub", path: "/v1/whatsapp", boundedContext: "messaging" },
        { name: "ai-commercial", path: "/v1/ai", boundedContext: "intelligence" },
        { name: "quotes", path: "/v1/quotes", boundedContext: "billing-sales" },
        { name: "billing", path: "/v1/billing", boundedContext: "payments" },
        { name: "operations", path: "/v1/operations", boundedContext: "ops" },
        { name: "whitelabel", path: "/v1/whitelabel", boundedContext: "platform" },
        { name: "marketplace", path: "/v1/marketplace", boundedContext: "platform" },
        { name: "scheduling", path: "/v1/scheduling", boundedContext: "operations" },
        { name: "postsale", path: "/v1/postsale", boundedContext: "retention" }
      ],
      messaging: { inbox: "InboxEvent", outbox: "OutboxEvent", queue: "BullMQ/Redis" }
    };
  }
}
