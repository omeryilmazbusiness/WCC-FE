export type SupplierLinkType = "package" | "departure" | "service";

export type ConfirmationStatus = "pending" | "confirmed" | "cancelled";

export type Supplier = {
  id: string;
  branchId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  terms: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupplierLink = {
  id: string;
  supplierId: string;
  linkType: SupplierLinkType;
  linkId: string;
  confirmationStatus: ConfirmationStatus;
  confirmationRef: string;
  confirmedAt: string | null;
  allotment: number;
  sold: number;
  unitCost: number;
  currency: string;
  notes: string;
  oversold: boolean;
  createdAt: string;
  updatedAt: string;
};

export const LINK_TYPES: SupplierLinkType[] = [
  "package",
  "departure",
  "service",
];
