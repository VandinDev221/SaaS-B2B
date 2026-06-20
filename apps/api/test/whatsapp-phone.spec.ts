import {
  injectBrazilMobileNine,
  jidToWhatsAppDigits,
  normalizeBrazilMobile,
  normalizeWhatsAppContact,
  resolveOutboundTarget
} from "../src/common/utils/whatsapp-phone";

describe("whatsapp-phone", () => {
  it("insere 9 em celular BR de 12 digitos (entrada manual)", () => {
    expect(injectBrazilMobileNine("559870112031")).toBe("5598970112031");
  });

  it("normaliza entrada manual para 13 digitos", () => {
    expect(normalizeBrazilMobile("559870112031")).toBe("5598970112031");
    expect(normalizeBrazilMobile("5598970112031")).toBe("5598970112031");
  });

  it("preserva digitos do JID WhatsApp sem injetar 9 extra", () => {
    expect(jidToWhatsAppDigits("559885894988@s.whatsapp.net")).toBe("559885894988");
    expect(normalizeWhatsAppContact("559885894988")).toBe("559885894988");
    expect(normalizeBrazilMobile("559885894988")).toBe("5598985894988");
  });

  it("resolve outbound a partir do JID da conversa", () => {
    expect(
      resolveOutboundTarget({
        externalRef: "559870112031@s.whatsapp.net",
        leadPhone: null
      })
    ).toBe("559870112031");
  });

  it("nao envia para @lid — usa telefone real do lead", () => {
    expect(
      resolveOutboundTarget({
        externalRef: "161426345865251@lid",
        leadPhone: "+559885894988"
      })
    ).toBe("559885894988");
  });

  it("ignora @lid quando nao ha telefone valido", () => {
    expect(
      resolveOutboundTarget({
        externalRef: "161426345865251@lid",
        leadPhone: null
      })
    ).toBeNull();
  });
});
