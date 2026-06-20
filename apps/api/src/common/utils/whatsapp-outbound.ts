/** Payload quoted exigido pela Evolution/Baileys para responder no thread @lid. */
export type EvolutionQuotedReply = {
  key: { id: string; remoteJid: string; fromMe: boolean };
  message: { conversation: string };
};

export function buildQuotedReply(input: {
  evolutionMessageId?: string | null;
  threadJid?: string | null;
  inboundBody?: string | null;
}): EvolutionQuotedReply | undefined {
  const id = String(input.evolutionMessageId ?? "").trim();
  const threadJid = String(input.threadJid ?? "").trim();
  const body = String(input.inboundBody ?? "").trim();
  if (!id || !threadJid || !body) return undefined;

  return {
    key: { id, remoteJid: threadJid, fromMe: false },
    message: { conversation: body.slice(0, 2000) }
  };
}
