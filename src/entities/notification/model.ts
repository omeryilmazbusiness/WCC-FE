import { routes } from "@/shared/config/routes";

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

/** Active notifications of one kind for the viewer (grouped center view). */
export type NotificationGroup = {
  kind: string;
  severity: NotificationSeverity;
  title: string;
  href: string;
  open: number;
  acknowledged: number;
  occurrences: number;
  latestAt: string;
};

export type NotificationListParams = {
  status?: NotificationStatus;
  includeResolved?: boolean;
  kinds?: readonly string[];
  limit?: number;
  offset?: number;
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

/** Deep link for a notification: its record when known, else the rule's screen. */
export function notificationHref(
  n: Pick<AppNotification, "entityType" | "entityId" | "hrefHint">,
): string {
  if (n.entityId) {
    if (n.entityType === "booking") return routes.booking(n.entityId);
    if (n.entityType === "customer") return routes.customer(n.entityId);
  }
  return n.hrefHint;
}

export function toneFromSeverity(
  severity: NotificationSeverity,
): "default" | "warning" | "critical" | "success" {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  return "default";
}
