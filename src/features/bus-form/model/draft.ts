import {
  busCompanyIssues,
  companyToInput,
  emptyBusCompanyInput,
  type BusCompany,
  type BusCompanyInput,
  type BusField,
  type VehicleClass,
} from "@/entities/bus";

export type BusDraft = {
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

export type BusDraftField = BusField;

export const SERVER_FIELD: Record<string, BusDraftField> = {
  name: "name",
  phone: "phone",
  email: "email",
  country: "country",
  vehicle_class: "vehicleClass",
  contact_phone: "contactPhone",
};

export function newDraft(): BusDraft {
  return emptyBusCompanyInput();
}

export function draftFromCompany(c: BusCompany): BusDraft {
  return companyToInput(c);
}

export function draftToInput(d: BusDraft): BusCompanyInput {
  return {
    name: d.name,
    phone: d.phone,
    email: d.email,
    website: d.website,
    country: d.country,
    city: d.city,
    address: d.address,
    vehicleClass: d.vehicleClass,
    licenseNo: d.licenseNo,
    contactName: d.contactName,
    contactPhone: d.contactPhone,
    notes: d.notes,
    isActive: d.isActive,
  };
}

export function draftErrors(d: BusDraft): Partial<Record<BusDraftField, string>> {
  return busCompanyIssues(draftToInput(d));
}
