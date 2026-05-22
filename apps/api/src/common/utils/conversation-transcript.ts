export type TranscriptMessage = {
  direction: string;
  body: string;
  createdAt?: Date | string;
};

export type BuildTranscriptOptions = {
  limit?: number;
  highlightLastInbound?: boolean;
};

export type TranscriptResult = {
  transcript: string;
  lastInbound: TranscriptMessage | null;
  messageCount: number;
};

function labelForDirection(direction: string): string {
  return direction === "inbound" ? "Cliente" : "Atendente";
}

function formatBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "(mensagem vazia)";
  return trimmed;
}

/** Monta transcript cronologico Cliente/Atendente para prompts de IA. */
export function buildConversationTranscript(
  messages: TranscriptMessage[],
  options: BuildTranscriptOptions = {}
): TranscriptResult {
  const limit = options.limit ?? 40;
  const sorted = [...messages].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
  const slice = sorted.length > limit ? sorted.slice(-limit) : sorted;

  const lines = slice.map(
    (m) => `${labelForDirection(m.direction)}: ${formatBody(m.body)}`
  );

  const inbounds = slice.filter((m) => m.direction === "inbound");
  const lastInbound = inbounds.length > 0 ? inbounds[inbounds.length - 1]! : null;

  let transcript = lines.join("\n");
  if (options.highlightLastInbound && lastInbound) {
    transcript += `\n\n--- Ultima mensagem do cliente (responda a isto) ---\n${formatBody(lastInbound.body)}`;
  }

  return {
    transcript: transcript || "Sem mensagens ainda.",
    lastInbound,
    messageCount: slice.length
  };
}
