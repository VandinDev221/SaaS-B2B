import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isProductionEnv } from "../../config/env.validation";
import { EvolutionApiClient } from "./evolution-api.client";
import type { EvolutionQuotedReply } from "../../common/utils/whatsapp-outbound";

@Injectable()
export class WhatsappAdapterService {
  private readonly logger = new Logger(WhatsappAdapterService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly evolution: EvolutionApiClient
  ) {}

  private assertCanSend(tenantId: string, to: string, context: string) {
    if (this.evolution.isConfigured()) return;

    const allowMock =
      !isProductionEnv(this.config as unknown as Record<string, unknown>) &&
      this.config.get<string>("ALLOW_WHATSAPP_MOCK", "false") === "true";

    if (allowMock) {
      this.logger.warn(
        `WhatsApp mock (${context}) tenant=${tenantId} to=${to} — configure EVOLUTION_API_URL`
      );
      return;
    }

    throw new ServiceUnavailableException(
      "WhatsApp nao configurado. Defina EVOLUTION_API_URL e credenciais."
    );
  }

  async sendTemplateMessage(input: {
    tenantId: string;
    to: string;
    templateName: string;
    body?: string;
    variables?: Record<string, string>;
    quoted?: EvolutionQuotedReply;
  }) {
    const text =
      input.body ??
      (input.templateName === "free_text"
        ? ""
        : `Mensagem FLOWOS (${input.templateName})`);

    if (!text.trim()) {
      throw new Error("Mensagem vazia");
    }

    this.assertCanSend(input.tenantId, input.to, "template");

    if (this.evolution.isConfigured()) {
      const sent = await this.evolution.sendText(input.to, text, { quoted: input.quoted });
      return {
        provider: "evolution",
        providerMessageId: sent.providerMessageId,
        deliveryStatus: sent.deliveryStatus
      };
    }

    return { provider: "mock", providerMessageId: `wa_${Date.now()}` };
  }

  async sendDocumentMessage(input: {
    tenantId: string;
    to: string;
    pdf: Buffer;
    fileName: string;
    caption: string;
  }) {
    this.assertCanSend(input.tenantId, input.to, "document");

    if (this.evolution.isConfigured()) {
      return await this.evolution.sendDocument(
        input.to,
        input.pdf,
        input.fileName,
        input.caption
      );
    }

    return { provider: "mock", providerMessageId: `wa_doc_${Date.now()}` };
  }
}
