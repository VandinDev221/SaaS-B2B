export type UserRole = "owner" | "admin" | "manager" | "agent" | "viewer";

export type TenantContext = {
  tenantId: string;
  companyId: string;
  userId: string;
  role: UserRole;
};

export type LeadStage = "new" | "qualified" | "proposal_sent" | "negotiation" | "won" | "lost";

export type ChannelType = "whatsapp" | "email" | "phone" | "web";

export type IncidentSeverity = "info" | "warning" | "critical";
export type IncidentStatus = "open" | "acknowledged" | "resolved" | "suppressed";

export type NotificationChannelType = "in_app" | "email" | "whatsapp" | "webhook";
export type NotificationStatus = "pending" | "sent" | "failed" | "canceled";

