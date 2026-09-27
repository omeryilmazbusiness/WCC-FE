/** First-response SLA per channel; `*` is the branch default. */
export type SlaPolicy = {
  channel: string;
  firstResponseSeconds: number;
};

export type NotificationSeverity = "info" | "warning" | "critical";

/** Effective escalation rule for a notification kind (defaults merged with branch overrides). */
export type EscalationRule = {
  kind: string;
  severity: NotificationSeverity;
  escalateAfterSeconds: number;
  escalateToRoles: string[];
  groupable: boolean;
  defaultTitle: string;
  defaultHref: string;
  entityType: string;
  /** A branch override exists; deleting it restores the default. */
  overridden: boolean;
  enabled: boolean;
};

export type EscalationInput = {
  escalateAfterSeconds: number;
  escalateToRoles: string[];
  enabled: boolean;
};

export const ESCALATION_ROLES = ["manager", "gm", "admin", "finance", "operations"] as const;

export type LostReason = {
  id: string;
  code: string;
  labelEn: string;
  labelAr: string;
  isActive: boolean;
  sortOrder: number;
};

export type MessageTemplate = {
  id: string;
  code: string;
  channel: string;
  subject: string;
  bodyEn: string;
  bodyAr: string;
  isActive: boolean;
  updatedAt: string;
};

export type FieldEntity = "lead" | "customer" | "booking" | string;

export type CustomFieldDef = {
  key: string;
  labelEn: string;
  labelAr: string;
  fieldType: "text" | "number" | "select" | "date" | "boolean" | string;
  required: boolean;
  options: string[];
  sortOrder: number;
};

export type FieldSettings = {
  entity: FieldEntity;
  fields: CustomFieldDef[];
};

/** Branch alert knobs the automation engine reads (BE `alert_threshold_settings`). */
export type ThresholdSettings = {
  capacitySoftPct: number;
  paymentOverdueHours: number;
  missingDocHours: number;
  leadNoFollowupHours: number;
  targetBehindPct: number;
  /** SLA A: warning at this share of the first-response window. */
  slaWarnPct: number;
  /** SLA B: breach at this share of the first-response window. */
  slaBreachPct: number;
  visaFollowUpDays: number;
};

export type ThresholdKey = keyof ThresholdSettings;

/** Allowed ranges, mirroring the backend validation. */
export const THRESHOLD_LIMITS: Record<ThresholdKey, { min: number; max: number }> = {
  capacitySoftPct: { min: 1, max: 100 },
  paymentOverdueHours: { min: 1, max: 720 },
  missingDocHours: { min: 1, max: 720 },
  leadNoFollowupHours: { min: 1, max: 720 },
  targetBehindPct: { min: 1, max: 100 },
  slaWarnPct: { min: 10, max: 100 },
  slaBreachPct: { min: 50, max: 300 },
  visaFollowUpDays: { min: 1, max: 90 },
};

export type ThresholdError = { key: ThresholdKey; reason: "range" | "warnAboveBreach" };

/** First problem found, or null when the backend would accept the settings. */
export function validateThresholds(t: ThresholdSettings): ThresholdError | null {
  for (const key of Object.keys(THRESHOLD_LIMITS) as ThresholdKey[]) {
    const v = t[key];
    const { min, max } = THRESHOLD_LIMITS[key];
    if (!Number.isInteger(v) || v < min || v > max) return { key, reason: "range" };
  }
  if (t.slaWarnPct >= t.slaBreachPct) return { key: "slaWarnPct", reason: "warnAboveBreach" };
  return null;
}

/** Minutes after which a share (`pct` %) of an SLA window (seconds) elapses, rounded. */
export function slaScaledMinutes(windowSeconds: number, pct: number): number {
  return Math.round((windowSeconds * pct) / 6000);
}

/** Canonical domain event (BE `/v1/events/catalog`). */
export type EventCatalogItem = {
  name: string;
  description: string;
  idempotent: boolean;
  /** Delivered through the transactional outbox (survives restarts, retried). */
  durable: boolean;
};

export type CreateLostReasonInput = {
  code: string;
  labelEn?: string;
  labelAr?: string;
  sortOrder?: number;
};

export type UpdateLostReasonInput = {
  code?: string;
  labelEn?: string;
  labelAr?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type CreateTemplateInput = {
  code: string;
  channel?: string;
  subject?: string;
  bodyEn?: string;
  bodyAr?: string;
};

export type UpdateTemplateInput = {
  code?: string;
  channel?: string;
  subject?: string;
  bodyEn?: string;
  bodyAr?: string;
  isActive?: boolean;
};
