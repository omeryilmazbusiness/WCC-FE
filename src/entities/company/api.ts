import { http } from "@/shared/api/http-client";
import { parsePlanTerm, type PlanTerm } from "./term";
import type { CompanyPlan } from "./plan";

/** Tenant row in the platform console (`GET /platform/companies`). */
export type PlatformCompany = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  country: string;
  city: string;
  address: string;
  is_active: boolean;
  created_at: string;
  branch_count: number;
  user_count: number;
  gm_email: string;
  has_logo: boolean;
  /** Changes with every logo upload; `null` without a logo. */
  logo_version: string | null;
  plan: CompanyPlan;
  term?: PlanTerm | null;
};

export type RegisterCompanyInput = {
  name_en: string;
  name_ar?: string;
  /** Empty lets the backend derive it from the English name. */
  slug?: string;
  country?: string;
  city?: string;
  address?: string;
  gm: { full_name: string; email: string; password: string };
  plan: "standard" | "premium" | "ultimate";
};

export type RegisteredCompany = {
  company: { id: string; slug: string; name_en: string };
  main_center: { id: string; slug: string; name_en: string };
  gm_user_id: string;
};

export const COMPANY_LIST_LIMIT = 100;

function mapCompany(raw: PlatformCompany): PlatformCompany {
  const term = parsePlanTerm((raw as PlatformCompany & { term?: unknown }).term);
  return { ...raw, term };
}

export async function listCompanies(params?: { q?: string }): Promise<PlatformCompany[]> {
  const sp = new URLSearchParams({ limit: String(COMPANY_LIST_LIMIT) });
  if (params?.q) sp.set("q", params.q);
  const rows = await http.request<PlatformCompany[]>(`/platform/companies?${sp}`);
  return Array.isArray(rows) ? rows.map(mapCompany) : [];
}

export async function getCompany(id: string): Promise<PlatformCompany> {
  return mapCompany(await http.request<PlatformCompany>(`/platform/companies/${id}`));
}

export async function saveCompany(
  id: string,
  body: {
    name_en: string;
    name_ar?: string;
    slug?: string;
    country?: string;
    city?: string;
    address?: string;
  },
): Promise<PlatformCompany> {
  return mapCompany(
    await http.request<PlatformCompany>(`/platform/companies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

export async function updateCompanyPlan(id: string, plan: CompanyPlan): Promise<PlatformCompany> {
  return mapCompany(
    await http.request<PlatformCompany>(`/platform/companies/${id}/plan`, {
      method: "PUT",
      body: JSON.stringify({ plan }),
    }),
  );
}

/** Soft-deletes the tenant. `slug` must match the live web address. */
export async function deleteCompany(id: string, slug: string): Promise<void> {
  await http.request(`/platform/companies/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ slug }),
  });
}

/** Creates the company, its main center and the GM account in one transaction. */
export async function registerCompany(body: RegisterCompanyInput): Promise<RegisteredCompany> {
  return http.request<RegisteredCompany>("/platform/companies", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
