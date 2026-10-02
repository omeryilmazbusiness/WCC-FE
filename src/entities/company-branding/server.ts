import { cache } from "react";
import { isApiError } from "@/shared/api/api-error";
import { backendJson } from "@/shared/api/server/backend";
import { isCompanySlug } from "@/shared/lib/workspace-path";
import { mapCompanyBranding, type CompanyBranding } from "./model";

export type BrandingLookup = { status: "found"; branding: CompanyBranding } | { status: "not_found" } | { status: "unavailable" };

/** Pre sign-in lookup for a company login page; never throws. Deduped per request (page + metadata). */
export const loadCompanyBranding = cache(async (slug: string): Promise<BrandingLookup> => {
  if (!isCompanySlug(slug)) return { status: "not_found" };
  try {
    const raw = await backendJson<unknown>(`/public/companies/${encodeURIComponent(slug)}`);
    return { status: "found", branding: mapCompanyBranding(raw) };
  } catch (err) {
    return isApiError(err) && err.status === 404 ? { status: "not_found" } : { status: "unavailable" };
  }
});
