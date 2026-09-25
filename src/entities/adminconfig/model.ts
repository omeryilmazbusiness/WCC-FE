export type SlaSettings = {
  firstResponseMinutes: number;
  resolveMinutes: number;
  businessHoursOnly: boolean;
};

export type EscalationKind =
  | "sla_breach"
  | "unanswered"
  | "overdue_task"
  | "payment_due"
  | string;

export type EscalationRule = {
  kind: EscalationKind;
  afterMinutes: number;
  notifyRoles: string[];
  escalateToRole: string;
  enabled: boolean;
};

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

export type ThresholdSettings = {
  softCapacityPct: number;
  hardCapacityPct: number;
  overdueTaskHours: number;
  unpaidBookingDays: number;
  marginAlertPct: number;
};

export type EventCatalogItem = {
  code: string;
  category: string;
  description: string;
  severity: string;
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
