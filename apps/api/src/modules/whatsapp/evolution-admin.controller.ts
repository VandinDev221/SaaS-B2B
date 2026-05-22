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
      const state = await this.evolution.connectionState();
      const connectionState =
        (state as { instance?: { state?: string } }).instance?.state ??
        (state as { state?: string }).state ??
        "unknown";

      return {
        configured: true,
        provider: "evolution",
        instance: this.evolution.instanceName(),
        connectionState,
        webhookUrl: this.evolution.webhookUrl()
      };
    } catch (err) {
      return {
        configured: true,
        provider: "evolution",
        instance: this.evolution.instanceName(),
        connectionState: "offline",
        error: err instanceof Error ? err.message : String(err)
      };
    }
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
      const connect = await this.evolution.connect();
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
