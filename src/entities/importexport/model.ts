export type ImportEntityType =
  | "customers"
  | "bookings"
  | "payments"
  | "departures";

export type ImportMode = "create" | "update" | "upsert";

export type ImportJobStatus =
  | "uploaded"
  | "mapped"
  | "validated"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type FieldDef = {
  key: string;
  label: string;
  required: boolean;
  type: string;
};

export type ImportJob = {
  id: string;
  branchId: string;
  entityType: ImportEntityType;
  mode: ImportMode;
  status: ImportJobStatus;
  fileName: string;
  contentType: string;
  headers: string[];
  mapping: Record<string, string>;
  previewRows: string[][];
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  rollbackToken: string;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
};

export type MappingTemplate = {
  id: string;
  name: string;
  entityType: ImportEntityType;
  mapping: Record<string, string>;
  createdAt: string;
};

export const ENTITY_TYPES: ImportEntityType[] = [
  "customers",
  "bookings",
  "payments",
  "departures",
];

export const IMPORT_MODES: ImportMode[] = ["upsert", "create", "update"];
