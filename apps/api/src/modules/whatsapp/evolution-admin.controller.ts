import { Controller, Get, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { EvolutionApiClient } from "../integrations/evolution-api.client";

@Controller("integrations/whatsapp/evolution")
export class EvolutionAdminController {
  constructor(private readonly evolution: EvolutionApiClient) {}

  @Roles(UserRole.owner, UserRole.admin)
  @Get("status")
  async status() {
    if (!this.evolution.isConfigured()) {
      return {
        configured: false,
        provider: "mock",
        message: "Defina WHATSAPP_PROVIDER=evolution e EVOLUTION_API_URL no .env"
      };
    }

    try {
      const state = await this.withTimeout(this.evolution.connectionState(), 12_000);
      const connectionState =
        (state as { instance?: { state?: string } }).instance?.state ??
        (state as { state?: string }).state ??
        "unknown";

      const connected = connectionState === "open" || connectionState === "connected";
      const webhook =
        connected ? await this.evolution.ensureWebhook() : { synced: false, url: this.evolution.webhookUrl() };

      return {
        configured: true,
        provider: "evolution",
        instance: this.evolution.instanceName(),
        connectionState,
        webhookUrl: this.evolution.webhookUrl(),
        webhookSynced: webhook.synced,
        evolutionApiUrl: this.evolution.apiUrl(),
        ...(webhook.error ? { webhookError: webhook.error } : {}),
        ...(connected && webhook.synced
          ? { message: "WhatsApp conectado. Webhook sincronizado — mensagens devem aparecer no Inbox (aba Todos)." }
          : connected && !webhook.synced
            ? {
                message:
                  "WhatsApp conectado, mas o webhook falhou. Clique em Sincronizar webhook ou aguarde cold start da Evolution."
              }
            : connectionState === "close"
              ? { message: "Instancia pronta. Clique em Conectar / Gerar QR Code." }
              : {})
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const coldStart = /timeout|inacessivel|fetch failed/i.test(message);
      return {
        configured: true,
        provider: "evolution",
        instance: this.evolution.instanceName(),
        connectionState: coldStart ? "close" : "offline",
        evolutionApiUrl: this.evolution.apiUrl(),
        error: coldStart
          ? "Evolution acordando (Render free). Aguarde ~1 min e clique Atualizar status."
          : message
      };
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Evolution timeout — servidor pode estar hibernando")), ms)
      )
    ]);
  }

  @Roles(UserRole.owner, UserRole.admin)
  @Post("setup")
  async setup() {
    if (!this.evolution.isConfigured()) {
      return { ok: false, message: "Evolution nao configurado no .env" };
    }
    try {
      const result = await this.evolution.setup();
      const webhook = await this.evolution.ensureWebhook();
      return {
        ok: true,
        ...result,
        webhookSynced: webhook.synced,
        ...(webhook.error ? { webhookError: webhook.error } : {})
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  @Roles(UserRole.owner, UserRole.admin)
  @Post("connect")
  async connect() {
    if (!this.evolution.isConfigured()) {
      return { ok: false, message: "Evolution nao configurado no .env" };
    }
    try {
      const connect = await this.evolution.connectForQr();
      const webhook = await this.evolution.ensureWebhook();
      return {
        ok: true,
        connect,
        webhookSynced: webhook.synced,
        ...(webhook.error ? { webhookError: webhook.error } : {})
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  @Roles(UserRole.owner, UserRole.admin)
  @Post("sync-webhook")
  async syncWebhook() {
    if (!this.evolution.isConfigured()) {
      return { ok: false, message: "Evolution nao configurado no .env" };
    }
    try {
      await this.evolution.setWebhook();
      return {
        ok: true,
        message:
          "Webhook sincronizado com header apikey. Envie uma mensagem de teste e veja o Inbox (aba Todos).",
        webhookUrl: this.evolution.webhookUrl(),
        instance: this.evolution.instanceName()
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/does not exist|instanceId/i.test(message)) {
        return {
          ok: false,
          message:
            "Banco Evolution incompleto (migrations v2.3.7). No Neon SQL: DROP SCHEMA evolution CASCADE; CREATE SCHEMA evolution; — depois redeploy flowos-evolution e tente de novo."
        };
      }
      return { ok: false, message };
    }
  }

  @Roles(UserRole.owner, UserRole.admin)
  @Post("disconnect")
  async disconnect() {
    if (!this.evolution.isConfigured()) {
      return { ok: false, message: "Evolution nao configurado no .env" };
    }
    try {
      await this.evolution.logout();
      let connectionState = "close";
      try {
        const state = await this.evolution.connectionState();
        connectionState =
          (state as { instance?: { state?: string } }).instance?.state ??
          (state as { state?: string }).state ??
          "close";
      } catch {
        connectionState = "close";
      }
      return {
        ok: true,
        message: "WhatsApp desconectado. Para usar de novo, gere um novo QR Code.",
        instance: this.evolution.instanceName(),
        connectionState
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }
}
