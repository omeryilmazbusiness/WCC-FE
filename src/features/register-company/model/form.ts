import {
  isCityName,
  isCountryName,
  isStreetAddress,
  normalizeAddress,
  normalizeCity,
  normalizeCountry,
} from "@/entities/company/place";
import { parseCompanyPlan, type CompanyPlan } from "@/entities/company/plan";
import { passwordIssue, slugify } from "@/features/gm-setup/model/flow";

export type RegisterCompanyForm = {
  nameEn: string;
  nameAr: string;
  slug: string;
  country: string;
  city: string;
  address: string;
  plan: CompanyPlan;
  gmName: string;
  gmEmail: string;
  gmPassword: string;
};

export type RegisterField = keyof RegisterCompanyForm;

export const EMPTY_REGISTER_FORM: Omit<RegisterCompanyForm, "gmPassword"> = {
  nameEn: "",
  nameAr: "",
  slug: "",
  country: "",
  city: "",
  address: "",
  plan: "standard",
  gmName: "",
  gmEmail: "",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Backend detail keys → form fields. */
export const REGISTER_SERVER_FIELDS: Record<string, RegisterField> = {
  name_en: "nameEn",
  name_ar: "nameAr",
  slug: "slug",
  country: "country",
  city: "city",
  address: "address",
  plan: "plan",
  gm_full_name: "gmName",
  gm_email: "gmEmail",
  email: "gmEmail",
  gm_password: "gmPassword",
};

/** Instant hints; the backend stays authoritative. Location is required. */
export function registerCompanyHints(f: RegisterCompanyForm): Partial<Record<RegisterField, string>> {
  const out: Partial<Record<RegisterField, string>> = {};
  const name = f.nameEn.trim();
  if (name.length < 2 || name.length > 120) out.nameEn = "nameEn";
  const slug = f.slug.trim() || slugify(name);
  if (!/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])$/.test(slug)) out.slug = "slug";
  if (!isCountryName(f.country)) out.country = "country";
  if (!isCityName(f.city)) out.city = "city";
  if (!isStreetAddress(f.address)) out.address = "address";
  if (!parseCompanyPlan(f.plan)) out.plan = "plan";
  if (f.gmName.trim().length < 2) out.gmName = "gmName";
  if (!EMAIL.test(f.gmEmail.trim())) out.gmEmail = "gmEmail";
  const pw = passwordIssue(f.gmPassword);
  if (pw) out.gmPassword = `password.${pw}`;
  return out;
}

export function registerCompanyPayload(f: RegisterCompanyForm) {
  return {
    name_en: f.nameEn.trim(),
    name_ar: f.nameAr.trim() || undefined,
    slug: f.slug.trim() || undefined,
    country: normalizeCountry(f.country),
    city: normalizeCity(f.city),
    address: normalizeAddress(f.address),
    plan: parseCompanyPlan(f.plan) ?? "standard",
    gm: { full_name: f.gmName.trim(), email: f.gmEmail.trim(), password: f.gmPassword },
  };
}
