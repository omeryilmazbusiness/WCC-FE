export type Customer = {
  id: string;
  branchId: string;
  fullName: string;
  fullNameAr: string;
  phone: string;
  email: string;
  nationality: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerCreateInput = {
  fullName: string;
  fullNameAr?: string;
  phone: string;
  email?: string;
  nationality?: string;
  notes?: string;
};
