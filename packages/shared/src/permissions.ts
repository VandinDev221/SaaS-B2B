import type { UserRole } from "./types";

export type Permission =
  | "dashboard.read"
  | "crm.read"
  | "crm.write"
  | "inbox.read"
  | "inbox.write"
  | "operations.read"
  | "operations.write"
  | "alerts.read"
  | "alerts.write"
  | "billing.read"
  | "billing.write"
  | "admin.saas";

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  owner: [
    "dashboard.read",
    "crm.read",
    "crm.write",
    "inbox.read",
    "inbox.write",
    "operations.read",
    "operations.write",
    "alerts.read",
    "alerts.write",
    "billing.read",
    "billing.write",
    "admin.saas"
  ],
  admin: [
    "dashboard.read",
    "crm.read",
    "crm.write",
    "inbox.read",
    "inbox.write",
    "operations.read",
    "operations.write",
    "alerts.read",
    "alerts.write",
    "billing.read",
    "billing.write"
  ],
  manager: [
    "dashboard.read",
    "crm.read",
    "crm.write",
    "inbox.read",
    "inbox.write",
    "operations.read",
    "alerts.read"
  ],
  agent: ["dashboard.read", "crm.read", "crm.write", "inbox.read", "inbox.write", "operations.read"],
  viewer: ["dashboard.read", "crm.read", "inbox.read", "alerts.read"]
} as const;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

