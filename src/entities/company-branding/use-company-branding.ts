"use client";

import { useEffect, useMemo } from "react";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { createCompanyBrandingApi } from "./api";
import type { CompanyBranding } from "./model";

const CHANGED = "wcc:company-branding-changed";

/** Tells every mounted `useCompanyBranding` (header, documents) that the logo or name changed. */
export function announceCompanyBrandingChanged(branding: CompanyBranding): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<CompanyBranding>(CHANGED, { detail: branding }));
}

/**
 * Public branding of a company (name + logo version). Cached per company, so moving
 * between screens never refetches the header logo; uploads elsewhere update it live.
 */
export function useCompanyBranding(slug: string | undefined): CompanyBranding | null {
  const api = useMemo(() => createCompanyBrandingApi(), []);
  const query = useApiQuery(() => api.get(slug ?? ""), [api, slug], {
    enabled: Boolean(slug),
    cacheKey: ["company-branding", slug],
  });
  const { setData } = query;

  useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<CompanyBranding>).detail;
      if (next?.slug && next.slug === slug) setData(next);
    };
    window.addEventListener(CHANGED, onChange);
    return () => window.removeEventListener(CHANGED, onChange);
  }, [slug, setData]);

  return slug && query.data?.slug === slug ? query.data : null;
}
