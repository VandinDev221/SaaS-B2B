/** Extrai texto legivel do payload Baileys/Evolution (inclui midia sem legenda). */
export function extractEvolutionMessageText(message: Record<string, unknown>): string {
  const conv = String(message.conversation ?? "").trim();
  if (conv) return conv;

  const extended = message.extendedTextMessage as Record<string, unknown> | undefined;
  if (extended?.text) return String(extended.text).trim();

  const buttons = message.buttonsResponseMessage as Record<string, unknown> | undefined;
  if (buttons?.selectedDisplayText) return String(buttons.selectedDisplayText).trim();

  const list = message.listResponseMessage as Record<string, unknown> | undefined;
  const single = list?.singleSelectReply as Record<string, unknown> | undefined;
  if (single?.title) return String(single.title).trim();

  for (const key of ["imageMessage", "videoMessage", "documentMessage"] as const) {
    const part = message[key] as Record<string, unknown> | undefined;
    const caption = String(part?.caption ?? "").trim();
    if (caption) return caption;
  }

  if (message.audioMessage) return "[Audio]";
  if (message.stickerMessage) return "[Figurinha]";
  if (message.imageMessage) return "[Imagem]";
  if (message.videoMessage) return "[Video]";
  if (message.documentMessage) return "[Documento]";
  if (message.contactMessage) return "[Contato]";
  if (message.locationMessage) return "[Localizacao]";

  return "";
}

export function isEvolutionFromMe(key: Record<string, unknown>): boolean {
  return key.fromMe === true || key.fromMe === "true" || key.fromMe === 1;
}

/** Aceita messages.upsert, MESSAGES_UPSERT, etc. */
export function isEvolutionMessageEvent(event: string): boolean {
  const e = event.toLowerCase();
  if (!e) return true;
  return e.includes("message");
}
