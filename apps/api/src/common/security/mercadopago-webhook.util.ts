import { createHmac, timingSafeEqual } from "crypto";

export function verifyMercadoPagoWebhook(input: {
  secret: string;
  xSignature: string;
  xRequestId: string;
  dataId: string;
}): boolean {
  const parts = input.xSignature.split(",");
  const tsPart = parts.find((p) => p.trim().startsWith("ts="));
  const v1Part = parts.find((p) => p.trim().startsWith("v1="));
  if (!tsPart || !v1Part) return false;

  const ts = tsPart.split("=")[1]?.trim();
  const v1 = v1Part.split("=")[1]?.trim();
  if (!ts || !v1) return false;

  const manifest = `id:${input.dataId};request-id:${input.xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");

  try {
    const a = Buffer.from(v1, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) {
      const aStr = Buffer.from(v1, "utf8");
      const bStr = Buffer.from(expected, "utf8");
      if (aStr.length !== bStr.length) return false;
      return timingSafeEqual(aStr, bStr);
    }
    return timingSafeEqual(a, b);
  } catch {
    const aStr = Buffer.from(v1, "utf8");
    const bStr = Buffer.from(expected, "utf8");
    if (aStr.length !== bStr.length) return false;
    return timingSafeEqual(aStr, bStr);
  }
}
