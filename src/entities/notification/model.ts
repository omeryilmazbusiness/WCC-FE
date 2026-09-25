export type NotificationSeverity = "info" | "warning" | "critical";
export type NotificationStatus = "open" | "acknowledged" | "resolved";

export type AppNotification = {
  id: string;
  branchId: string;
  recipientUserId: string;
  kind: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  entityType: string;
  entityId: string | null;
  groupKey: string;
  occurrenceCount: number;
  status: NotificationStatus;
  hrefHint: string;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
};

export type NotificationPreference = {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppMandatory: boolean;
  updatedAt: string;
};

export type EscalationRule = {
  kind: string;
  severity: NotificationSeverity;
  escalateAfterSeconds: number;
  escalateToRoles: string[];
  groupable: boolean;
  defaultTitle: string;
  defaultHref: string;
  entityType: string;
};

export function toneFromSeverity(
  severity: NotificationSeverity,
): "default" | "warning" | "critical" | "success" {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  return "default";
}
