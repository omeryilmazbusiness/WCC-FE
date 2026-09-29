import { http } from "@/shared/api/http-client";

/** Tenant row in the platform console (`GET /platform/companies`). */
export type PlatformCompany = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  country: string;
  city: string;
  is_active: boolean;
  created_at: string;
  branch_count: number;
  user_count: number;
  gm_email: string;
};

export type RegisterCompanyInput = {
  name_en: string;
  name_ar?: string;
  /** Empty lets the backend derive it from the English name. */
  slug?: string;
  country?: string;
  city?: string;
  gm: { full_name: string; email: string; password: string };
};

export type RegisteredCompany = {
  company: { id: string; slug: string; name_en: string };
  main_center: { id: string; slug: string; name_en: string };
  gm_user_id: string;
};

export const COMPANY_LIST_LIMIT = 100;

export async function listCompanies(params?: { q?: string }): Promise<PlatformCompany[]> {
  const sp = new URLSearchParams({ limit: String(COMPANY_LIST_LIMIT) });
  if (params?.q) sp.set("q", params.q);
  return http.request<PlatformCompany[]>(`/platform/companies?${sp}`);
}

/** Creates the company, its main center and the GM account in one transaction. */
export async function registerCompany(body: RegisterCompanyInput): Promise<RegisteredCompany> {
  return http.request<RegisteredCompany>("/platform/companies", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
