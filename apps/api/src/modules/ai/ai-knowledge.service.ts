import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { getCatalog, SUPPORTED_NICHES } from "../quotes/catalog";

export type AiKnowledgeDto = {
  businessDescription: string;
  productsAndServices: string;
  quoteInstructions: string;
  toneOfVoice: string;
  autoSendQuotePdf: boolean;
  autoCreateQuoteFromChat: boolean;
};

export const DEFAULT_AI_KNOWLEDGE: AiKnowledgeDto = {
  businessDescription: `Empresa de solucoes comerciais B2B (CFTV, alarmes, instalacao e suporte).
Atendimento consultivo pelo WhatsApp: primeiro entender o pedido do cliente, depois propor valor com clareza.`,

  productsAndServices: `CFTV / Seguranca:
- Instalacao CFTV (ate 4 cameras): R$ 890
- Camera IP Full HD: R$ 320/un
- Gravador NVR 8 canais: R$ 650
- Manutencao mensal: R$ 149/mes

Servicos gerais:
- Visita tecnica: R$ 120
- Hora tecnica: R$ 95
- Contrato mensal de suporte: R$ 497/mes`,

  quoteInstructions: `REGRAS OBRIGATORIAS:
1. SEMPRE analisar toda a conversa antes de gerar orcamento.
2. So gerar e enviar PDF quando o pedido do cliente estiver claro (o que precisa, quantidade, local se aplicavel).
3. Se faltar informacao, responder no WhatsApp perguntando o que falta — NAO enviar orcamento incompleto.
4. Somente enviar o orcamento APOS atender o pedido do cliente (esclarecer duvidas e confirmar entendimento).
5. Itens do orcamento devem refletir exatamente o que foi combinado na conversa.
6. Validade padrao 7 dias. Desconto maximo 10% sem aprovacao manual.`,

  toneOfVoice: "profissional, cordial e objetivo — linguagem de WhatsApp, frases curtas",
  autoSendQuotePdf: false,
  autoCreateQuoteFromChat: false
};

const defaults = DEFAULT_AI_KNOWLEDGE;

export const NICHE_AI_PACKS: Record<
  string,
  Pick<AiKnowledgeDto, "businessDescription" | "productsAndServices" | "toneOfVoice">
> = {
  cftv: {
    businessDescription: "Empresa de CFTV, alarmes e segurança eletrônica. Venda consultiva B2B e residencial.",
    productsAndServices: getCatalog("cftv").map((i) => `${i.name}: R$ ${i.unitPrice}`).join("\n"),
    toneOfVoice: "técnico, seguro e consultivo"
  },
  oficina: {
    businessDescription: "Oficina mecânica com foco em revisão, freios e alinhamento.",
    productsAndServices: getCatalog("oficina").map((i) => `${i.name}: R$ ${i.unitPrice}`).join("\n"),
    toneOfVoice: "direto e confiável"
  },
  clinica: {
    businessDescription: "Clínica odontológica / saúde com agendamento e pós-consulta.",
    productsAndServices: getCatalog("clinica").map((i) => `${i.name}: R$ ${i.unitPrice}`).join("\n"),
    toneOfVoice: "acolhedor e profissional"
  },
  barbearia: {
    businessDescription: "Barbearia premium com agendamento online e planos de assinatura.",
    productsAndServices: getCatalog("barbearia").map((i) => `${i.name}: R$ ${i.unitPrice}`).join("\n"),
    toneOfVoice: "descontraído e objetivo"
  },
  solar: {
    businessDescription: "Integrador de energia solar fotovoltaica — projeto, instalação e homologação.",
    productsAndServices: getCatalog("solar").map((i) => `${i.name}: R$ ${i.unitPrice}`).join("\n"),
    toneOfVoice: "consultivo e orientado a ROI"
  },
  delivery: {
    businessDescription: "Restaurante / dark kitchen com delivery e retirada.",
    productsAndServices: getCatalog("delivery").map((i) => `${i.name}: R$ ${i.unitPrice}`).join("\n"),
    toneOfVoice: "rápido e simpático"
  },
  contabilidade: {
    businessDescription: "Escritório contábil para MEI, Simples e abertura de empresas.",
    productsAndServices: getCatalog("contabilidade").map((i) => `${i.name}: R$ ${i.unitPrice}`).join("\n"),
    toneOfVoice: "formal e claro"
  },
  services: {
    businessDescription: "Prestação de serviços técnicos B2B com contratos recorrentes.",
    productsAndServices: getCatalog("services").map((i) => `${i.name}: R$ ${i.unitPrice}`).join("\n"),
    toneOfVoice: "profissional e cordial"
  }
};

@Injectable()
export class AiKnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string): Promise<AiKnowledgeDto> {
    const row = await this.prisma.tenantAiKnowledge.findUnique({ where: { tenantId } });
    if (!row) return { ...defaults };
    return {
      businessDescription: row.businessDescription,
      productsAndServices: row.productsAndServices,
      quoteInstructions: row.quoteInstructions,
      toneOfVoice: row.toneOfVoice,
      autoSendQuotePdf: row.autoSendQuotePdf,
      autoCreateQuoteFromChat: row.autoCreateQuoteFromChat
    };
  }

  async upsert(tenantId: string, input: Partial<AiKnowledgeDto>) {
    return this.prisma.tenantAiKnowledge.upsert({
      where: { tenantId },
      create: {
        tenantId,
        businessDescription: input.businessDescription ?? defaults.businessDescription,
        productsAndServices: input.productsAndServices ?? defaults.productsAndServices,
        quoteInstructions: input.quoteInstructions ?? defaults.quoteInstructions,
        toneOfVoice: input.toneOfVoice ?? defaults.toneOfVoice,
        autoSendQuotePdf: input.autoSendQuotePdf ?? defaults.autoSendQuotePdf,
        autoCreateQuoteFromChat:
          input.autoCreateQuoteFromChat ?? defaults.autoCreateQuoteFromChat
      },
      update: {
        ...(input.businessDescription !== undefined
          ? { businessDescription: input.businessDescription }
          : {}),
        ...(input.productsAndServices !== undefined
          ? { productsAndServices: input.productsAndServices }
          : {}),
        ...(input.quoteInstructions !== undefined
          ? { quoteInstructions: input.quoteInstructions }
          : {}),
        ...(input.toneOfVoice !== undefined ? { toneOfVoice: input.toneOfVoice } : {}),
        ...(input.autoSendQuotePdf !== undefined
          ? { autoSendQuotePdf: input.autoSendQuotePdf }
          : {}),
        ...(input.autoCreateQuoteFromChat !== undefined
          ? { autoCreateQuoteFromChat: input.autoCreateQuoteFromChat }
          : {})
      }
    });
  }

  async buildSystemContext(tenantId: string): Promise<string> {
    const k = await this.get(tenantId);
    const parts = [
      "Voce e assistente comercial da empresa no FLOWOS.",
      k.businessDescription ? `Sobre o negocio: ${k.businessDescription}` : "",
      k.productsAndServices ? `Produtos/servicos: ${k.productsAndServices}` : "",
      k.quoteInstructions ? `Regras de orcamento: ${k.quoteInstructions}` : "",
      `Tom de voz: ${k.toneOfVoice}.`,
      "Fluxo: analise a conversa -> atenda o cliente -> so entao gere orcamento e envie PDF se aplicavel."
    ];
    return parts.filter(Boolean).join("\n");
  }

  listNiches() {
    return SUPPORTED_NICHES.map((id) => ({
      id,
      label: id.replace(/_/g, " "),
      hasPack: Boolean(NICHE_AI_PACKS[id])
    }));
  }

  async applyNichePack(tenantId: string, niche: string) {
    const pack = NICHE_AI_PACKS[niche];
    if (!pack) {
      const items = getCatalog(niche);
      if (!items.length) throw new Error(`Nicho desconhecido: ${niche}`);
      return this.upsert(tenantId, {
        businessDescription: `Negócio segmento ${niche}.`,
        productsAndServices: items.map((i) => `${i.name}: R$ ${i.unitPrice}`).join("\n")
      });
    }
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { niche } });
    return this.upsert(tenantId, {
      ...pack,
      quoteInstructions: defaults.quoteInstructions
    });
  }
}
