import { z } from "zod";
import type { IncidentSeverity, NotificationChannelType } from "./types";

export const AutomationEventNameSchema = z.string().min(1);
export type AutomationEventName = z.infer<typeof AutomationEventNameSchema>;

export const AutomationEventSchema = z.object({
  name: AutomationEventNameSchema,
  tenantId: z.string().min(1),
  occurredAt: z.string().datetime().optional(),
  payload: z.record(z.unknown()).default({})
});
export type AutomationEvent = z.infer<typeof AutomationEventSchema>;

export const AlertRuleConditionSchema = z.object({
  kind: z.enum([
    "lead.no_response_sla",
    "lead.stale",
    "billing.invoice_overdue",
    "integration.down",
    "automation.failed",
    "queue.backlog"
  ]),
  params: z.record(z.unknown()).default({})
});
export type AlertRuleCondition = z.infer<typeof AlertRuleConditionSchema>;

export const AlertRuleDraftSchema = z.object({
  name: z.string().min(2),
  isEnabled: z.boolean().default(true),
  severity: z.custom<IncidentSeverity>(),
  condition: AlertRuleConditionSchema,
  channels: z.array(z.custom<NotificationChannelType>()).default([]),
  throttleMs: z.number().int().min(0).default(300_000)
});
export type AlertRuleDraft = z.infer<typeof AlertRuleDraftSchema>;

export type AlertFingerprintInput = {
  ruleId: string;
  tenantId: string;
  keyParts: readonly string[];
};

export function buildFingerprint(input: AlertFingerprintInput): string {
  // Simple and stable; can be replaced with a hash later (keeps DB unique key small)
  return [input.tenantId, input.ruleId, ...input.keyParts].join("|").slice(0, 512);
}

