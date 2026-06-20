import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { normalizeBrazilMobile } from "../../common/utils/whatsapp-phone";

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
    return this.config.get<string>(
      "EVOLUTION_WEBHOOK_URL",
      "http://host.docker.internal:4000/v1/integrations/whatsapp/webhook/evolution"
    );
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
    let data: T;
    try {
      data = text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
      throw new Error(`Evolution resposta invalida (${res.status}): ${text}`);
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
    const normalized = normalizeBrazilMobile(phone.replace(/\D/g, ""));
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
    text: string
  ): Promise<{ providerMessageId: string; deliveryStatus?: string }> {
    await this.assertConnectedForSend();
    const number = this.normalizePhone(to);
    const data = await this.request<{ key?: { id?: string } }>(
      `/message/sendText/${this.instanceName()}`,
      {
        method: "POST",
        body: { number, text }
      }
    );
    const id = data?.key?.id ?? `evo_${Date.now()}`;
    const deliveryStatus = String((data as { status?: string }).status ?? "PENDING");
    this.logger.log(
      `Evolution sendText ok to=${number} (input=${to}) id=${id} status=${deliveryStatus}`
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
    const number = this.normalizePhone(to);
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

  async connect() {
    return this.request<{ base64?: string; pairingCode?: string; code?: string }>(
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

  private async ensureInstance(): Promise<boolean> {
    if (await this.instanceExists()) {
      this.logger.log(`Instancia Evolution "${this.instanceName()}" ja existe`);
      return false;
    }

    try {
      await this.createInstance();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("INSTANCE_EXISTS:") || /already in use/i.test(msg)) {
        this.logger.log(`Instancia "${this.instanceName()}" ja registrada na Evolution, continuando`);
        return false;
      }
      this.logger.warn(`Create com webhook falhou, tentando instancia basica: ${msg}`);
      try {
        await this.request(`/instance/create`, {
          method: "POST",
          body: {
            instanceName: this.instanceName(),
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
          }
        });
        return true;
      } catch (retryErr) {
        const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        if (retryMsg.startsWith("INSTANCE_EXISTS:") || /already in use/i.test(retryMsg)) {
          return false;
        }
        throw retryErr;
      }
    }
  }

  async setup() {
    const created = await this.ensureInstance();

    try {
      await this.setWebhook();
    } catch (err) {
      this.logger.warn(`Webhook set falhou (pode ja existir): ${err}`);
    }

    const connect = await this.connect();
    const state = await this.connectionState();
    const rawState =
      (state as { instance?: { state?: string } }).instance?.state ??
      (state as { state?: string }).state ??
      (state as { connectionStatus?: string }).connectionStatus ??
      "unknown";

    return { created, connect, connectionState: rawState };
  }
}
