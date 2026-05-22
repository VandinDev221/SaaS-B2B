export const AUTOMATION_QUEUE_NAME = "flowos-automation";

export const AutomationJobName = {
  FOLLOWUP_D1_SCAN: "followup.d1.scan",
  FOLLOWUP_D1_EXECUTE: "followup.d1.execute",
  FOLLOWUP_D7_SCAN: "followup.d7.scan",
  FOLLOWUP_D7_EXECUTE: "followup.d7.execute",
  BILLING_RECOVERY_SCAN: "billing.recovery.scan",
  BILLING_RECOVERY_EXECUTE: "billing.recovery.execute",
  POSTSALE_SCAN: "postsale.scan",
  POSTSALE_EXECUTE: "postsale.execute",
  TRIAL_EXPIRY_SCAN: "tenant.trial.expiry.scan",
  GENERIC_EVENT: "automation.event"
} as const;

export type AutomationJobName = (typeof AutomationJobName)[keyof typeof AutomationJobName];

export const FOLLOWUP_D1_PLAYBOOK = "followup_d1";
export const FOLLOWUP_D7_PLAYBOOK = "followup_d7";
