-- Backfill needsReply / lastMessageDirection from the latest message per conversation
UPDATE "Conversation" c
SET
  "lastMessageDirection" = sub.direction,
  "needsReply" = (sub.direction = 'inbound')
FROM (
  SELECT DISTINCT ON (m."conversationId")
    m."conversationId",
    m.direction
  FROM "Message" m
  ORDER BY m."conversationId", m."createdAt" DESC
) sub
WHERE c.id = sub."conversationId";
