import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EvolutionApiClient } from "../integrations/evolution-api.client";
import { PrismaService } from "../../prisma/prisma.service";
import { WhatsappWebhookService } from "./whatsapp-webhook.service";

/** Puxa mensagens da Evolution em background (webhook falha no Render free). */
@Injectable()
export class WhatsappInboxSyncWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappInboxSyncWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionApiClient,
    private readonly webhook: WhatsappWebhookService
  ) {}

  isEnabled(): boolean {
    return (
      this.config.get<string>("WHATSAPP_INBOX_SYNC_ENABLED", "true") !== "false" &&
      this.evolution.isConfigured()
    );
  }

  intervalMs(): number {
    return Number(this.config.get<string>("WHATSAPP_INBOX_SYNC_INTERVAL_MS", "8000"));
  }

  onModuleInit() {
    if (!this.isEnabled()) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervalMs());
    this.logger.log(`Sync Evolution ativo a cada ${this.intervalMs()}ms`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const instance = this.evolution.instanceName();
      const tenants = await this.prisma.tenant.findMany({
        where: { isActive: true },
        select: { id: true, whatsappInstance: true }
      });

      for (const tenant of tenants) {
        if (tenant.whatsappInstance && tenant.whatsappInstance !== instance) continue;
        const result = await this.webhook.syncInboxFromEvolution(tenant.id);
        if (result.imported > 0) {
          this.logger.log(`Sync tenant=${tenant.id} +${result.imported} msgs`);
        }
      }
    } catch (err) {
      this.logger.warn(`Sync Evolution falhou: ${err instanceof Error ? err.message : err}`);
    } finally {
      this.running = false;
    }
  }
}
