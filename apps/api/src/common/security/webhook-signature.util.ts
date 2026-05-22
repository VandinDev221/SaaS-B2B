import { createHmac, timingSafeEqual } from "crypto";

export function signWebhookPayload(secret: string, timestamp: string, body: unknown): string {
  const payload = `${timestamp}.${JSON.stringify(body)}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyWebhookSignature(input: {
  secret: string;
  signature: string;
  timestamp: string;
  body: unknown;
  toleranceSeconds?: number;
}): boolean {
  const toleranceSeconds = input.toleranceSeconds ?? 300;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const timestampSeconds = Number(input.timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds) return false;

  const expectedHex = signWebhookPayload(input.secret, input.timestamp, input.body);
  const received = Buffer.from(input.signature, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}
