export function conversationStateFromDirection(direction: "inbound" | "outbound") {
  return {
    lastMessageDirection: direction,
    needsReply: direction === "inbound"
  };
}
