import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { normalizeWhatsAppContact } from "../../common/utils/whatsapp-phone";
import type { EvolutionQuotedReply } from "../../common/utils/whatsapp-outbound";

type EvolutionFetchOptions = {
  method?: string;
  body?: unknown;
};

@Injectable()
export class EvolutionApiClient {
  private readonly logger = new Logger(EvolutionApiClient.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return (
      this.config.get<string>("WHATSAPP_PROVIDER", "mock") === "evolution" &&
      !!this.config.get<string>("EVOLUTION_API_URL")
    );
  }

  apiKey(): string {
    return this.config.get<string>("EVOLUTION_API_KEY", "");
  }

  instanceName(): string {
    return this.config.get<string>("EVOLUTION_INSTANCE", "flowos");
  }

  webhookUrl(): string {
    const configuredWebhook = this.config.get<string>("EVOLUTION_WEBHOOK_URL");
    if (configuredWebhook) {
      return configuredWebhook;
    }
    const renderExternalUrl = this.config.get<string>("RENDER_EXTERNAL_URL");
    if (renderExternalUrl) {
      return `${renderExternalUrl.replace(/\/$/, "")}/v1/integrations/whatsapp/webhook/evolution`;
    }
    return this.config.get<string>(
      "EVOLUTION_WEBHOOK_URL",
      "http://host.docker.internal:4000/v1/integrations/whatsapp/webhook/evolution"
    );
  }

  apiUrl(): string {
    return this.baseUrl();
  }

  private baseUrl() {
    return this.config.get<string>("EVOLUTION_API_URL", "").replace(/\/$/, "");
  }

  private headers() {
    const key = this.apiKey();
    return {
      "content-type": "application/json",
      ...(key ? { apikey: key } : {})
    };
  }

  private async request<T>(path: string, opts: EvolutionFetchOptions = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl()}${path}`, {
        method: opts.method ?? "GET",
        headers: this.headers(),
        ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {})
      });
    } catch {
      throw new Error(
        `Evolution inacessivel em ${this.baseUrl()}. Verifique EVOLUTION_API_URL no .env e se o Docker esta rodando.`
      );
    }

    const text = await res.text();

    if (
      res.status === 502 ||
      res.status === 503 ||
      /^<!DOCTYPE html>/i.test(text.trim())
    ) {
      throw new Error(
        "Evolution offline no Render (502/503). No plano free, aguarde ~1 min e tente de novo (cold start). " +
          "Se persistir apos o servico ficar Live: Neon SQL -> DROP SCHEMA evolution CASCADE; CREATE SCHEMA evolution; " +
          "depois Render -> flowos-evolution -> Manual Deploy (aguarde migrations) e reconecte o WhatsApp."
      );
    }

    let data: T;
    try {
      data = text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
      const preview = text.length > 180 ? `${text.slice(0, 180)}…` : text;
      throw new Error(`Evolution resposta invalida (${res.status}): ${preview}`);
    }

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error(
          `Evolution API 401 Unauthorized: EVOLUTION_API_KEY nao confere com AUTHENTICATION_API_KEY do servidor em ${this.baseUrl()}. ` +
            `Confira apps/api/.env (ex.: docker inspect <container> | findstr AUTHENTICATION_API_KEY).`
        );
      }
      if (res.status === 403 && /already in use|j[aá] existe/i.test(text)) {
        throw new Error(`INSTANCE_EXISTS:${text}`);
      }
      throw new Error(`Evolution API ${res.status}: ${text}`);
    }

    return data;
  }

  normalizePhone(phone: string): string {
    const normalized = normalizeWhatsAppContact(phone);
    if (!normalized) {
      throw new Error(
        `Numero WhatsApp invalido: "${phone}". Use DDD + numero (ex.: 559884325771 ou +55 98 8432-5771).`
      );
    }
    return normalized;
  }

  private async assertConnectedForSend() {
    const state = await this.connectionState();
    const connectionState =
      (state as { instance?: { state?: string } }).instance?.state ??
      (state as { state?: string }).state ??
      "unknown";

    if (connectionState !== "open" && connectionState !== "connected") {
      throw new Error(
        `WhatsApp desconectado (estado: ${connectionState}). Abra Configuracoes → WhatsApp e reconecte com QR Code.`
      );
    }
  }

  async sendText(
    to: string,
    text: string,
    opts?: { quoted?: EvolutionQuotedReply }
  ): Promise<{ providerMessageId: string; deliveryStatus?: string }> {
    await this.assertConnectedForSend();
    const raw = String(to ?? "").trim();
    if (raw.endsWith("@lid") && !opts?.quoted) {
      throw new Error(
        "Envio para @lid sem citar mensagem anterior nao entrega. Aguarde mensagem do cliente."
      );
    }
    const number = raw.includes("@") ? raw : this.normalizePhone(raw);
    const data = await this.request<{ key?: { id?: string } }>(
      `/message/sendText/${this.instanceName()}`,
      {
        method: "POST",
        body: {
          number,
          text,
          ...(opts?.quoted ? { quoted: opts.quoted } : {})
        }
      }
    );
    const id = data?.key?.id ?? `evo_${Date.now()}`;
    const deliveryStatus = String((data as { status?: string }).status ?? "PENDING");
    this.logger.log(
      `Evolution sendText ok to=${number} (input=${to}) id=${id} status=${deliveryStatus} quoted=${!!opts?.quoted}`
    );
    return { providerMessageId: id, deliveryStatus };
  }

  async sendDocument(
    to: string,
    pdf: Buffer,
    fileName: string,
    caption: string
  ): Promise<{ providerMessageId: string }> {
    await this.assertConnectedForSend();
    const raw = String(to ?? "").trim();
    if (raw.endsWith("@lid")) {
      throw new Error(
        "Envio para @lid nao entrega no celular. Corrija o telefone do lead ou peca nova mensagem do cliente."
      );
    }
    const number = raw.includes("@") ? raw : this.normalizePhone(raw);
    const base64 = pdf.toString("base64");
    const data = await this.request<{ key?: { id?: string } }>(
      `/message/sendMedia/${this.instanceName()}`,
      {
        method: "POST",
        body: {
          number,
          mediatype: "document",
          mimetype: "application/pdf",
          fileName,
          caption,
          media: base64
        }
      }
    );
    const id = data?.key?.id ?? `evo_doc_${Date.now()}`;
    this.logger.log(`Evolution sendDocument ok to=${number} file=${fileName}`);
    return { providerMessageId: id };
  }

  async findRecentMessages(limit = 30, page = 1) {
    return this.request<{
      messages?: {
        records?: Array<Record<string, unknown>>;
      };
    }>(`/chat/findMessages/${this.instanceName()}`, {
      method: "POST",
      body: { limit, page }
    });
  }

  async fetchInstances() {
    return this.request<unknown[]>("/instance/fetchInstances");
  }

  async connectionState() {
    try {
      return await this.request<{ instance?: { state?: string }; state?: string }>(
        `/instance/connectionState/${this.instanceName()}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (this.isMissingInstanceError(msg)) {
        return { state: "close" };
      }
      throw err;
    }
  }

  private extractConnectQr(raw: unknown) {
    if (!raw || typeof raw !== "object") {
      return { base64: undefined as string | undefined, pairingCode: undefined as string | null | undefined, code: undefined as string | undefined };
    }
    const r = raw as Record<string, unknown>;
    const nested = r.qrcode as Record<string, unknown> | undefined;
    const base64 = String(r.base64 ?? nested?.base64 ?? "").trim() || undefined;
    const pairingCode = (r.pairingCode ?? nested?.pairingCode) as string | null | undefined;
    const code = String(r.code ?? nested?.code ?? "").trim() || undefined;
    return { base64, pairingCode, code };
  }

  private formatConnectPayload(raw: unknown) {
    const qr = this.extractConnectQr(raw);
    return {
      base64: qr.base64,
      pairingCode: qr.pairingCode ?? null,
      code: qr.code,
      ...(qr.base64 || qr.pairingCode || qr.code
        ? { qrcode: { base64: qr.base64, pairingCode: qr.pairingCode ?? null, code: qr.code } }
        : {})
    };
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async connectForQr() {
    const waits = [0, 2000, 4000, 6000];
    let lastRaw: unknown = {};
    for (const wait of waits) {
      if (wait > 0) await this.delay(wait);
      lastRaw = await this.connect();
      const qr = this.extractConnectQr(lastRaw);
      if (qr.base64 || qr.pairingCode) {
        return this.formatConnectPayload(lastRaw);
      }
    }
    return this.formatConnectPayload(lastRaw);
  }

  async connect() {
    return this.request<{ base64?: string; pairingCode?: string; code?: string; qrcode?: { base64?: string } }>(
      `/instance/connect/${this.instanceName()}`,
      { method: "GET" }
    );
  }

  /** Encerra a sessao WhatsApp na instancia (logout). */
  async logout() {
    return this.request<{ status?: string; message?: string }>(
      `/instance/logout/${this.instanceName()}`,
      { method: "DELETE" }
    );
  }

  private webhookConfig() {
    const webhookSecret = this.config.get<string>("EVOLUTION_WEBHOOK_SECRET", "");
    return {
      enabled: true,
      url: this.webhookUrl(),
      byEvents: false,
      base64: false,
      events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
      ...(webhookSecret ? { headers: { apikey: webhookSecret } } : {})
    };
  }

  private isMissingInstanceError(message: string): boolean {
    return (
      /404|not found|does not exist|instance.*not/i.test(message) ||
      (/400/i.test(message) && /length|undefined|instance/i.test(message))
    );
  }

  async createInstance() {
    return this.request(`/instance/create`, {
      method: "POST",
      body: {
        instanceName: this.instanceName(),
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: this.webhookConfig()
      }
    });
  }

  async setWebhook() {
    return this.request(`/webhook/set/${this.instanceName()}`, {
      method: "POST",
      body: { webhook: this.webhookConfig() }
    });
  }

  async fetchWebhook(): Promise<{ url?: string; enabled?: boolean } | null> {
    try {
      const raw = await this.request<{
        url?: string;
        enabled?: boolean;
        webhook?: { url?: string; enabled?: boolean };
      }>(`/webhook/find/${this.instanceName()}`);
      const nested = raw.webhook;
      return {
        url: nested?.url ?? raw.url,
        enabled: nested?.enabled ?? raw.enabled
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (this.isMissingInstanceError(msg) || /404|not found/i.test(msg)) return null;
      throw err;
    }
  }

  /** Garante webhook apontando para a API com header apikey (idempotente). */
  async ensureWebhook(): Promise<{ synced: boolean; url: string; previousUrl?: string; error?: string }> {
    const expectedUrl = this.webhookUrl();
    let previousUrl: string | undefined;
    try {
      const current = await this.fetchWebhook();
      previousUrl = current?.url;
    } catch (err) {
      this.logger.warn(`Webhook find falhou, aplicando set: ${err}`);
    }

    try {
      await this.setWebhook();
      this.logger.log(`Webhook Evolution sincronizado url=${expectedUrl}`);
      return { synced: true, url: expectedUrl, previousUrl };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Webhook Evolution nao sincronizado: ${error}`);
      return { synced: false, url: expectedUrl, previousUrl, error };
    }
  }

  private instanceNameFromRow(row: unknown): string | undefined {
    const r = row as {
      name?: string;
      instanceName?: string;
      instance?: { instanceName?: string };
    };
    return r.name ?? r.instanceName ?? r.instance?.instanceName;
  }

  private async instanceExists(): Promise<boolean> {
    try {
      const list = await this.fetchInstances();
      if (!Array.isArray(list)) return false;
      const name = this.instanceName();
      return list.some((row) => this.instanceNameFromRow(row) === name);
    } catch {
      return false;
    }
  }

  private async ensureInstance(): Promise<{ created: boolean; response?: unknown }> {
    if (await this.instanceExists()) {
      this.logger.log(`Instancia Evolution "${this.instanceName()}" ja existe`);
      return { created: false };
    }

    try {
      const response = await this.createInstance();
      return { created: true, response };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("INSTANCE_EXISTS:") || /already in use/i.test(msg)) {
        this.logger.log(`Instancia "${this.instanceName()}" ja registrada na Evolution, continuando`);
        return { created: false };
      }
      this.logger.warn(`Create com webhook falhou, tentando instancia basica: ${msg}`);
      try {
        const response = await this.request(`/instance/create`, {
          method: "POST",
          body: {
            instanceName: this.instanceName(),
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
          }
        });
        return { created: true, response };
      } catch (retryErr) {
        const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        if (retryMsg.startsWith("INSTANCE_EXISTS:") || /already in use/i.test(retryMsg)) {
          return { created: false };
        }
        throw retryErr;
      }
    }
  }

  async setup() {
    const { created, response: createResponse } = await this.ensureInstance();

    try {
      await this.setWebhook();
    } catch (err) {
      this.logger.warn(`Webhook set falhou (pode ja existir): ${err}`);
    }

    const fromCreate = this.extractConnectQr(createResponse);
    let connect = this.formatConnectPayload(createResponse);
    if (!fromCreate.base64 && !fromCreate.pairingCode) {
      try {
        connect = this.formatConnectPayload(await this.connect());
      } catch (err) {
        this.logger.warn(`Connect imediato falhou: ${err}`);
      }
    }

    const state = await this.connectionState();
    const rawState =
      (state as { instance?: { state?: string } }).instance?.state ??
      (state as { state?: string }).state ??
      (state as { connectionStatus?: string }).connectionStatus ??
      "unknown";

    const hasQr = !!(connect.base64 || connect.pairingCode);
    return {
      created,
      connect,
      connectionState: rawState,
      ...(hasQr
        ? {}
        : {
            message:
              "Instancia criada, mas o QR ainda nao veio. Aguarde 5s e clique em Gerar QR Code de novo."
          })
    };
  }
}
