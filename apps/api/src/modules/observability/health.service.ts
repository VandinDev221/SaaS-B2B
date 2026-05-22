import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import IORedis from "ioredis";
import { PrismaService } from "../../prisma/prisma.service";
import { EvolutionApiClient } from "../integrations/evolution-api.client";
import { MercadoPagoClient } from "../integrations/mercado-pago.client";

type CheckResult = { status: "up" | "down"; message?: string };

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly evolution: EvolutionApiClient,
    private readonly mercadoPago: MercadoPagoClient
  ) {}

  live() {
    return {
      status: "ok",
      service: "flowos-api",
      timestamp: new Date().toISOString()
    };
  }

  async ready() {
    const checks: Record<string, CheckResult> = {};

    checks.database = await this.checkDatabase();
    checks.redis = await this.checkRedis();

    if (this.evolution.isConfigured()) {
      checks.evolution = await this.checkEvolution();
    }

    if (this.mercadoPago.isConfigured) {
      checks.mercado_pago = { status: "up", message: "token configurado" };
    }

    const allUp = Object.values(checks).every((c) => c.status === "up");
    return {
      status: allUp ? "ok" : "degraded",
      service: "flowos-api",
      timestamp: new Date().toISOString(),
      checks
    };
  }

  private async checkDatabase(): Promise<CheckResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "up" };
    } catch (e) {
      return { status: "down", message: e instanceof Error ? e.message : String(e) };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    const redisUrl = this.config.get<string>("REDIS_URL", "redis://localhost:6379");
    const client = new IORedis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 3000 });
    try {
      const pong = await client.ping();
      return pong === "PONG" ? { status: "up" } : { status: "down", message: "ping invalido" };
    } catch (e) {
      return { status: "down", message: e instanceof Error ? e.message : String(e) };
    } finally {
      await client.quit().catch(() => undefined);
    }
  }

  private async checkEvolution(): Promise<CheckResult> {
    try {
      const state = await this.evolution.connectionState();
      const raw = JSON.stringify(state).toLowerCase();
      if (raw.includes("open") || raw.includes("connected")) {
        return { status: "up" };
      }
      return { status: "down", message: "instancia nao conectada" };
    } catch (e) {
      return { status: "down", message: e instanceof Error ? e.message : String(e) };
    }
  }
}
