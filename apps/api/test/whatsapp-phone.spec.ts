import { injectBrazilMobileNine, normalizeBrazilMobile, resolveOutboundTarget } from "../src/common/utils/whatsapp-phone";

describe("whatsapp-phone", () => {
  it("insere 9 em celular BR de 12 digitos", () => {
    expect(injectBrazilMobileNine("559870112031")).toBe("5598970112031");
  });

  it("normaliza para 13 digitos", () => {
    expect(normalizeBrazilMobile("559870112031")).toBe("5598970112031");
    expect(normalizeBrazilMobile("5598970112031")).toBe("5598970112031");
  });

  it("resolve outbound a partir do JID da conversa", () => {
    expect(
      resolveOutboundTarget({
        externalRef: "559870112031@s.whatsapp.net",
        leadPhone: null
      })
    ).toBe("5598970112031");
  });

  it("prioriza @lid no externalRef para resposta no mesmo thread WhatsApp", () => {
    expect(
      resolveOutboundTarget({
        externalRef: "161426345865251@lid",
        leadPhone: "+5598985894988"
      })
    ).toBe("161426345865251@lid");
  });
});
