export type DocumentStatus =
  | "pending"
  | "uploaded"
  | "submitted"
  | "approved"
  | "rejected"
  | "expired"
  | "missing";

export type DocumentKind =
  | "passport"
  | "visa"
  | "receipt"
  | "photo"
  | "other"
  | string;

export type Document = {
  id: string;
  branchId: string;
  relatedType: string;
  relatedId: string;
  kind: DocumentKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: DocumentStatus;
  reviewNote: string;
  participantId: string | null;
  version: number;
  expiresAt: string | null;
  createdAt: string;
};

export type DocChecklistItem = {
  kind: DocumentKind;
  label: string;
  required: boolean;
  status: DocumentStatus;
  documentId: string | null;
  participantId: string | null;
  participantName: string;
  satisfied?: boolean;
};

export type DocChecklist = {
  bookingId: string;
  policyId: string | null;
  policyName: string;
  items: DocChecklistItem[];
  missingRequired: string[];
};

export type MissingDocsRow = {
  bookingId: string;
  participantId: string | null;
  customerId: string;
  missingKinds: string[];
};

export type PresignResult = {
  documentId: string;
  uploadUrl: string;
  storageKey: string;
  expiresInSec: number;
  status: string;
};

export const DOCUMENT_KINDS: DocumentKind[] = [
  "passport",
  "visa",
  "receipt",
  "photo",
  "other",
];

export const DOCUMENT_STATUSES: DocumentStatus[] = [
  "pending",
  "uploaded",
  "submitted",
  "approved",
  "rejected",
  "expired",
  "missing",
];
