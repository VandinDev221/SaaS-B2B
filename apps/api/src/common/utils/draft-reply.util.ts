export type InboundIntent =
  | "greeting"
  | "thanks"
  | "ack"
  | "price"
  | "scheduling"
  | "question"
  | "other";

const GREETING_RE =
  /^(?:oi|ol[aá]|e\s*a[ií]|hey|hi|hello|bom\s+dia|boa\s+tarde|boa\s+noite|tudo\s+bem|td\s+bem|como\s+vai)[\s!.,?]*$/i;

const THANKS_RE = /^(?:obrigad|valeu|agradeç|brigad)[\s\S]{0,40}$/i;

const ACK_RE = /^(?:ok|okay|blz|beleza|show|perfeito|certo|entendi|combinado)[\s!.,?]*$/i;

export function classifyInboundIntent(body: string): InboundIntent {
  const text = body.trim();
  if (!text) return "other";
  if (GREETING_RE.test(text)) return "greeting";
  if (THANKS_RE.test(text)) return "thanks";
  if (ACK_RE.test(text)) return "ack";

  const lower = text.toLowerCase();
  if (/prec[oç]|valor|quanto|custa|orçamento|orcamento|pagamento|pix/.test(lower)) return "price";
  if (/agendar|hor[aá]rio|visita|quando|dispon[ií]vel|marcar/.test(lower)) return "scheduling";
  if (/\?/.test(text) || /^(como|qual|quando|onde|por que|porque|tem|vocês|voces)/i.test(lower)) {
    return "question";
  }
  return "other";
}

function greetingMirror(body: string): string {
  const lower = body.toLowerCase();
  if (/boa\s+noite/.test(lower)) return "Boa noite";
  if (/boa\s+tarde/.test(lower)) return "Boa tarde";
  if (/bom\s+dia/.test(lower)) return "Bom dia";
  return "Ola";
}

export function buildDraftReplyFallback(firstName: string, lastInboundBody: string | null): string {
  const name = firstName.trim() || "tudo bem";
  if (!lastInboundBody?.trim()) {
    return `Ola ${name}! Como posso ajudar voce hoje?`;
  }

  const body = lastInboundBody.trim();
  const intent = classifyInboundIntent(body);

  switch (intent) {
    case "greeting":
      return `${greetingMirror(body)} ${name}! Tudo bem? Em que posso ajudar voce hoje?`;
    case "thanks":
      return `Por nada, ${name}! Fico a disposicao se precisar de mais alguma coisa.`;
    case "ack":
      return `Perfeito, ${name}! Qualquer duvida, e so chamar.`;
    case "price":
      return `Ola ${name}! Claro, me conta o que voce precisa (produto/servico e quantidade) que ja preparo o orcamento para voce.`;
    case "scheduling":
      return `Ola ${name}! Vamos agendar sim. Qual dia e horario funcionam melhor para voce?`;
    case "question":
      return `Ola ${name}! Boa pergunta. Me da um instante que ja te respondo com os detalhes.`;
    default:
      return `Ola ${name}! Entendi. Me conta um pouco mais do que voce precisa que eu te ajudo da melhor forma.`;
  }
}

/** Remove padroes ruins gerados por fallback antigo ou modelos fracos. */
export function sanitizeDraftReply(text: string): string {
  let out = text.trim();
  out = out.replace(/^Ola\s+[^!]+!\s*Sobre\s+"[^"]+"\s*:\s*/i, "Ola! ");
  out = out.replace(/\s*Vou verificar e te retorno em instantes com os proximos passos\.?\s*/gi, " ");
  out = out.replace(/\s{2,}/g, " ").trim();
  return out || text.trim();
}
