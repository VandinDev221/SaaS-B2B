import {
  buildDraftReplyFallback,
  classifyInboundIntent,
  sanitizeDraftReply
} from "../src/common/utils/draft-reply.util";

describe("draft-reply.util", () => {
  it("detecta cumprimento", () => {
    expect(classifyInboundIntent("boa tarde")).toBe("greeting");
    expect(classifyInboundIntent("Boa tarde!")).toBe("greeting");
    expect(classifyInboundIntent("oi")).toBe("greeting");
  });

  it("fallback de cumprimento nao cita a mensagem entre aspas", () => {
    const draft = buildDraftReplyFallback("Vanderson", "boa tarde");
    expect(draft).toMatch(/Boa tarde.*Vanderson/i);
    expect(draft).not.toMatch(/Sobre/i);
    expect(draft).not.toMatch(/verificar e te retorno/i);
  });

  it("sanitiza template antigo", () => {
    const raw =
      'Ola Vanderson! Sobre "Boa tarde!": entendi. Vou verificar e te retorno em instantes com os proximos passos.';
    const clean = sanitizeDraftReply(raw);
    expect(clean).not.toMatch(/Sobre "/i);
    expect(clean).not.toMatch(/verificar e te retorno/i);
  });
});
