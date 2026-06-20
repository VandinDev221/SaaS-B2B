/** Extrai digitos do JID WhatsApp sem reinterpretar (Evolution/Baileys e a fonte da verdade). */
export function jidToWhatsAppDigits(jid: string | undefined | null): string | null {
  if (!jid || !jid.endsWith("@s.whatsapp.net")) return null;
  const digits = jid.replace(/@.*/, "").replace(/\D/g, "");
  if (!digits.startsWith("55")) return null;
  if (digits.length < 12 || digits.length > 13) return null;
  const ddd = Number(digits.slice(2, 4));
  if (ddd < 11 || ddd > 99) return null;
  return digits;
}

/** Celular BR sem o 9 extra apos o DDD (12 digitos) → insere o 9 (13 digitos). */
export function injectBrazilMobileNine(digits: string): string {
  if (!digits.startsWith("55") || digits.length !== 12) return digits;
  const afterDdd = digits[4];
  if (afterDdd === "9") return digits;
  return `${digits.slice(0, 4)}9${digits.slice(4)}`;
}

export function normalizeBrazilMobile(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  while (digits.startsWith("55") && digits.length > 13) {
    digits = digits.slice(2);
  }

  if (!digits.startsWith("55")) {
    if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
    else return null;
  }

  if (digits.length === 12) {
    digits = injectBrazilMobileNine(digits);
  }

  if (digits.length !== 13) return null;

  const ddd = Number(digits.slice(2, 4));
  if (ddd < 11 || ddd > 99) return null;

  if (digits[4] !== "9") return null;

  return digits;
}

/**
 * Normaliza contato para envio WhatsApp.
 * Preserva digitos 12/13 ja vindos do JID (nao injeta 9 em numero que o WhatsApp ja conhece).
 */
export function normalizeWhatsAppContact(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) {
    const ddd = Number(digits.slice(2, 4));
    if (ddd >= 11 && ddd <= 99) return digits;
  }
  return normalizeBrazilMobile(digits);
}

export function toE164(digits: string): string {
  return `+${normalizeWhatsAppContact(digits) ?? normalizeBrazilMobile(digits) ?? digits}`;
}

/** Monta JID @s.whatsapp.net a partir de senderPn (Evolution/Baileys com @lid). */
function jidFromSenderPn(senderPn: unknown): string | null {
  const normalized = normalizeWhatsAppContact(String(senderPn ?? "").replace(/\D/g, ""));
  return normalized ? `${normalized}@s.whatsapp.net` : null;
}

/** Escolhe o JID com numero real (prioriza remoteJidAlt — remoteJid costuma ser @lid). */
export function resolveInboundJid(key: Record<string, unknown>): string | null {
  const candidates = [
    key.remoteJidAlt,
    key.participantAlt,
    key.participant,
    key.remoteJid
  ].map((v) => String(v ?? ""));

  for (const jid of candidates) {
    if (jidToWhatsAppDigits(jid)) return jid;
  }

  const fromPn = jidFromSenderPn(key.senderPn);
  if (fromPn) return fromPn;

  return null;
}

/** Telefone BR a partir do key/row do webhook Evolution. */
export function resolveInboundPhone(
  key: Record<string, unknown>,
  row?: Record<string, unknown>
): string | null {
  const jid = resolveInboundJid(key);
  if (jid) {
    const digits = jidToWhatsAppDigits(jid);
    if (digits) return digits;
  }

  const extras = [key?.senderPn, row?.senderPn, row?.sender, row?.phoneNumber, row?.number];
  for (const raw of extras) {
    const normalized = normalizeWhatsAppContact(String(raw ?? "").replace(/\D/g, ""));
    if (normalized) return normalized;
  }

  return null;
}

export function digitsToWhatsAppJid(digits: string): string | null {
  const normalized = normalizeWhatsAppContact(digits.replace(/\D/g, ""));
  return normalized ? `${normalized}@s.whatsapp.net` : null;
}

/** Destino de envio: sempre numero real — @lid nao entrega no celular do cliente. */
export function resolveOutboundTarget(input: {
  externalRef?: string | null;
  leadPhone?: string | null;
}): string | null {
  const ref = String(input.externalRef ?? "").trim();

  if (ref.endsWith("@s.whatsapp.net")) {
    const fromJid = jidToWhatsAppDigits(ref);
    if (fromJid) return fromJid;
  }

  if (input.leadPhone) {
    const fromLead = normalizeWhatsAppContact(input.leadPhone);
    if (fromLead) return fromLead;
  }

  return null;
}
