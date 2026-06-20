import {
  extractEvolutionMessageText,
  isEvolutionFromMe,
  isEvolutionMessageEvent
} from "../src/common/utils/extract-evolution-message";
import { resolveInboundPhone } from "../src/common/utils/whatsapp-phone";
import { WhatsappWebhookService } from "../src/modules/whatsapp/whatsapp-webhook.service";

describe("whatsapp webhook ingest", () => {
  const service = new WhatsappWebhookService({} as never, {} as never, {} as never);

  it("aceita evento MESSAGES_UPSERT", () => {
    expect(isEvolutionMessageEvent("MESSAGES_UPSERT")).toBe(true);
  });

  it("ignora mensagens fromMe", () => {
    const body = {
      event: "MESSAGES_UPSERT",
      instance: "flowos",
      data: {
        key: { remoteJid: "5598970112031@s.whatsapp.net", fromMe: true },
        message: { conversation: "oi" }
      }
    };
    expect(service.extractInboundMessages(body)).toHaveLength(0);
    expect(service.describeSkip(body)).toBe("from_me");
  });

  it("extrai mensagem inbound com JID normal", () => {
    const body = {
      event: "messages.upsert",
      instance: "flowos",
      data: {
        key: { remoteJid: "5598970112031@s.whatsapp.net", fromMe: false },
        message: { conversation: "Quero orcamento" },
        pushName: "Cliente"
      }
    };
    const msgs = service.extractInboundMessages(body);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.text).toBe("Quero orcamento");
    expect(msgs[0]?.remoteJid).toBe("5598970112031@s.whatsapp.net");
  });

  it("extrai mensagem quando remoteJid e @lid mas remoteJidAlt tem telefone", () => {
    const key = {
      remoteJid: "69385314111689@lid",
      remoteJidAlt: "5598970112031@s.whatsapp.net",
      fromMe: false
    };
    expect(resolveInboundPhone(key, {})).toBe("5598970112031");

    const body = {
      event: "MESSAGES_UPSERT",
      data: {
        key,
        message: { conversation: "Teste LID alt" }
      }
    };
    expect(service.extractInboundMessages(body)).toHaveLength(1);
  });

  it("extrai mensagem quando remoteJid e @lid e senderPn traz o numero", () => {
    const key = {
      remoteJid: "69385314111689@lid",
      senderPn: "5598970112031",
      fromMe: false
    };
    expect(resolveInboundPhone(key, {})).toBe("5598970112031");

    const body = {
      event: "MESSAGES_UPSERT",
      data: { key, message: { conversation: "Teste senderPn" } }
    };
    expect(service.extractInboundMessages(body)).toHaveLength(1);
  });

  it("aceita audio como texto placeholder", () => {
    const text = extractEvolutionMessageText({ audioMessage: {} });
    expect(text).toBe("[Audio]");
    expect(isEvolutionFromMe({ fromMe: false })).toBe(false);
  });
});
