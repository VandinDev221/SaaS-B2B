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
    @Headers("apikey") apiKeyHeader?: string,
    @Headers("x-api-key") xApiKeyHeader?: string
  ) {
    if (!this.isWebhookAuthorized(body, apiKeyHeader, xApiKeyHeader)) {
      this.logger.warn(
        `Webhook Evolution rejeitado (apikey invalida) header=${!!apiKeyHeader || !!xApiKeyHeader} body=${!!body.apikey}`
      );
      return { ok: false, reason: "unauthorized" };
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

  private isWebhookAuthorized(
    body: Record<string, unknown>,
    apiKeyHeader?: string,
    xApiKeyHeader?: string
  ): boolean {
    const webhookSecret = this.config.get<string>("EVOLUTION_WEBHOOK_SECRET");
    const evolutionApiKey = this.config.get<string>("EVOLUTION_API_KEY");
    const isProd = isProductionEnv(this.config as unknown as Record<string, unknown>);

    if (isProd && !webhookSecret && !evolutionApiKey) {
      return false;
    }

    if (!webhookSecret && !evolutionApiKey) {
      return true;
    }

    const provided = String(apiKeyHeader ?? xApiKeyHeader ?? body.apikey ?? "").trim();
    if (!provided) return false;

    if (webhookSecret && safeEqualStrings(provided, webhookSecret)) return true;
    if (evolutionApiKey && safeEqualStrings(provided, evolutionApiKey)) return true;
    return false;
  }

  private async resolveTenantId(body: Record<string, unknown>): Promise<string | null> {
    const configuredInstance = this.config.get<string>("EVOLUTION_INSTANCE", "flowos");
    const candidates = [
      body.instance,
      body.instanceName,
      (body.data as Record<string, unknown> | undefined)?.instance,
      configuredInstance
    ]
      .map((v) => String(v ?? "").trim())
      .filter(Boolean);

    const uniqueInstances = [...new Set(candidates)];

    for (const instance of uniqueInstances) {
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
    }

    const isProd = isProductionEnv(this.config as unknown as Record<string, unknown>);

    const activeTenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      take: 2
    });

    if (activeTenants.length === 1) {
      this.logger.warn(
        `Webhook Evolution: tenant unico (${activeTenants[0].id}) instance=${uniqueInstances[0] ?? "?"}`
      );
      return activeTenants[0].id;
    }

    if (isProd) {
      this.logger.error(
        `Webhook Evolution: tenant nao encontrado para instance=${uniqueInstances.join("|")} (sem fallback em producao)`
      );
      return null;
    }

    const fallback = activeTenants[0];
    if (fallback) {
      this.logger.warn(
        `Webhook Evolution: usando fallback tenant=${fallback.id} instance=${uniqueInstances[0] ?? "?"}`
      );
    }
    return fallback?.id ?? null;
  }
}
