export const VEHICLE_CLASSES = ["standard", "vip", "sleeper", "mixed"] as const;
export type VehicleClass = (typeof VEHICLE_CLASSES)[number];

export type BusCompany = {
  id: string;
  branchId: string;
  name: string;
  phone: string;
  email: string;
  website: string;
  country: string;
  city: string;
  address: string;
  vehicleClass: VehicleClass;
  licenseNo: string;
  contactName: string;
  contactPhone: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BusCompanyInput = {
  name: string;
  phone: string;
  email: string;
  website: string;
  country: string;
  city: string;
  address: string;
  vehicleClass: VehicleClass;
  licenseNo: string;
  contactName: string;
  contactPhone: string;
  notes: string;
  isActive: boolean;
};

export type BusListFilter = {
  query?: string;
  activeOnly?: boolean;
};

export function emptyBusCompanyInput(): BusCompanyInput {
  return {
    name: "",
    phone: "",
    email: "",
    website: "",
    country: "",
    city: "",
    address: "",
    vehicleClass: "standard",
    licenseNo: "",
    contactName: "",
    contactPhone: "",
    notes: "",
    isActive: true,
  };
}

export function companyToInput(c: BusCompany): BusCompanyInput {
  return {
    name: c.name,
    phone: c.phone,
    email: c.email,
    website: c.website,
    country: c.country,
    city: c.city,
    address: c.address,
    vehicleClass: c.vehicleClass,
    licenseNo: c.licenseNo,
    contactName: c.contactName,
    contactPhone: c.contactPhone,
    notes: c.notes,
    isActive: c.isActive,
  };
}

const PHONE = /^\+?[0-9][0-9 ()-]{5,19}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type BusField = "name" | "phone" | "email" | "country" | "vehicleClass" | "contactPhone";

/** Presentation-free field issues for the operator card. */
export function busCompanyIssues(input: BusCompanyInput): Partial<Record<BusField, string>> {
  const out: Partial<Record<BusField, string>> = {};
  const name = input.name.trim();
  if (name.length < 2 || name.length > 160) out.name = "name";
  if (input.phone.trim() && !PHONE.test(input.phone.trim())) out.phone = "phone";
  if (input.contactPhone.trim() && !PHONE.test(input.contactPhone.trim())) out.contactPhone = "phone";
  if (input.email.trim() && !EMAIL.test(input.email.trim())) out.email = "email";
  if (input.country.trim().length > 80) out.country = "country";
  if (!(VEHICLE_CLASSES as readonly string[]).includes(input.vehicleClass)) out.vehicleClass = "class";
  return out;
}

export function searchText(c: BusCompany): string {
  return [c.name, c.city, c.country, c.phone, c.contactName, c.licenseNo].join(" ").toLowerCase();
}
