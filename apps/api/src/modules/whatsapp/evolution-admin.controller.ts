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

      return {
        configured: true,
        provider: "evolution",
        instance: this.evolution.instanceName(),
        connectionState,
        webhookUrl: this.evolution.webhookUrl(),
        ...(connectionState === "close"
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
      return { ok: true, ...result };
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
      return { ok: true, connect };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
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
