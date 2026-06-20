import { buildQuotedReply } from "../src/common/utils/whatsapp-outbound";

describe("whatsapp-outbound", () => {
  it("monta quoted para responder no thread @lid", () => {
    expect(
      buildQuotedReply({
        evolutionMessageId: "3A83175F367580A7B2F3",
        threadJid: "161426345865251@lid",
        inboundBody: "Eu"
      })
    ).toEqual({
      key: {
        id: "3A83175F367580A7B2F3",
        remoteJid: "161426345865251@lid",
        fromMe: false
      },
      message: { conversation: "Eu" }
    });
  });

  it("retorna undefined sem id ou thread", () => {
    expect(buildQuotedReply({ evolutionMessageId: "", threadJid: "x@lid", inboundBody: "oi" })).toBeUndefined();
  });
});
