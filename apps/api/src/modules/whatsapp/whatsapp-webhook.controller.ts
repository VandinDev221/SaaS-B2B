import { Body, Controller, Headers, Logger, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Public } from "../../common/decorators/public.decorator";
import { safeEqualStrings } from "../../common/security/timing-safe.util";
import { isProductionEnv } from "../../config/env.validation";
import { PrismaService } from "../../prisma/prisma.service";
import { WhatsappWebhookService } from "./whatsapp-webhook.service";

@Controller("integrations/whatsapp")
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly webhook: WhatsappWebhookService
  ) {}

  @Public()
  @Post("webhook/evolution")
  async evolutionWebhook(
    @Body() body: Record<string, unknown>,
    @Headers("apikey") apiKey?: string
  ) {
    const expected = this.config.get<string>("EVOLUTION_WEBHOOK_SECRET");
    if (expected) {
      if (!apiKey || !safeEqualStrings(apiKey, expected)) {
        this.logger.warn("Webhook Evolution rejeitado (apikey invalida)");
        return { ok: false, reason: "unauthorized" };
      }
    }

    const messages = this.webhook.extractInboundMessages(body);
    if (messages.length === 0) {
      const event = String(body.event ?? "");
      const reason = this.webhook.describeSkip(body);
      this.logger.warn(
        `Webhook Evolution sem mensagens processaveis event=${event || "?"} reason=${reason}`
      );
      return { ok: true, skipped: reason, event: event || undefined };
    }

    const tenantId = await this.resolveTenantId(body);
    if (!tenantId) return { ok: false, reason: "no_tenant" };

    const results = [];
    for (const msg of messages) {
      results.push(await this.webhook.ingestInbound(tenantId, msg));
    }

    this.logger.log(
      `Webhook Evolution ok tenant=${tenantId} processed=${results.length} event=${String(body.event ?? "")}`
    );
    return { ok: true, tenantId, processed: results.length, results };
  }

  private async resolveTenantId(body: Record<string, unknown>): Promise<string | null> {
    const instance = String(
      body.instance ??
        (body.data as Record<string, unknown> | undefined)?.instance ??
        this.config.get("EVOLUTION_INSTANCE", "flowos")
    );

    const byInstance = await this.prisma.tenant.findFirst({
      where: { isActive: true, whatsappInstance: instance }
    });
    if (byInstance) return byInstance.id;

    const account = await this.prisma.whatsappAccount.findFirst({
      where: {
        status: "active",
        config: { path: ["evolutionInstance"], equals: instance }
      }
    });
    if (account) return account.tenantId;

    const isProd = isProductionEnv(this.config as unknown as Record<string, unknown>);
    if (isProd) {
      this.logger.error(
        `Webhook Evolution: tenant nao encontrado para instance=${instance} (sem fallback em producao)`
      );
      return null;
    }

    const fallback = await this.prisma.tenant.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" }
    });
    if (fallback) {
      this.logger.warn(
        `Webhook Evolution: usando fallback tenant=${fallback.id} instance=${instance}`
      );
    }
    return fallback?.id ?? null;
  }
}
