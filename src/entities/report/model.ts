export type ReportKind =
  | "sales"
  | "targets"
  | "readiness"
  | "sla"
  | "finance"
  | "integrations";

export type DrillRef = {
  entityType: string;
  entityId: string;
  hrefHint: string;
  label: string;
};

export type ReportRow = {
  id: string;
  label: string;
  metrics: Record<string, unknown>;
  severity: string;
  drilldowns: DrillRef[];
};

export type ReportResult = {
  kind: ReportKind;
  generatedAt: string;
  filter: Record<string, unknown>;
  summary: Record<string, unknown>;
  rows: ReportRow[];
  columns: string[];
};

export type ReportKindMeta = {
  kind: ReportKind;
  label: string;
  sensitive: boolean;
};

export type ReportFilter = {
  from?: string;
  to?: string;
  ownerId?: string;
  channel?: string;
  provider?: string;
  status?: string;
  departureId?: string;
  limit?: number;
};

export const REPORT_KINDS: ReportKind[] = [
  "sales",
  "targets",
  "readiness",
  "sla",
  "finance",
  "integrations",
];
