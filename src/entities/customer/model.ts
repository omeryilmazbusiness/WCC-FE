export type Customer = {
  id: string;
  branchId: string;
  fullName: string;
  fullNameAr: string;
  phone: string;
  email: string;
  nationality: string;
  passportNo: string;
  dateOfBirth?: string | null;
  preferences?: Record<string, unknown>;
  specialRequirements?: string;
  notes: string;
  mergedIntoId?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerCreateInput = {
  fullName: string;
  fullNameAr?: string;
  phone: string;
  email?: string;
  nationality?: string;
  passportNo?: string;
  dateOfBirth?: string;
  specialRequirements?: string;
  notes?: string;
};

export type CustomerUpdateInput = Partial<CustomerCreateInput> & {
  clearDob?: boolean;
  preferences?: Record<string, unknown>;
};

export type CompanionLink = {
  id: string;
  customer_id: string;
  companion_id: string;
  relation: string;
  notes: string;
  Companion?: Customer;
  companion?: {
    id: string;
    full_name?: string;
    fullName?: string;
    phone?: string;
  };
};

export type TimelineItem = {
  kind: string;
  id: string;
  title: string;
  status?: string;
  occurred_at: string;
  meta?: Record<string, unknown>;
};

export type DuplicateMatch = {
  customer: Customer;
  reasons: string[];
  score: number;
};
