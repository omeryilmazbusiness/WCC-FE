"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { companyDisplayName, companyLogoUrl, createCompanyBrandingApi } from "@/entities/company-branding";
import { useViewer } from "@/entities/viewer";
import type { CompanyBrand } from "./document-data";

/** The viewer's agency name and absolute logo URL for documents and messages. */
export function useCompanyBrand(): CompanyBrand {
  const locale = useLocale();
  const company = useViewer().workspace?.company;
  const name = company ? companyDisplayName(company, locale) : "";
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!company?.slug) return;
    let alive = true;
    createCompanyBrandingApi()
      .get(company.slug)
      .then((branding) => {
        const path = companyLogoUrl(branding);
        if (alive) setLogoUrl(path ? new URL(path, window.location.origin).toString() : null);
      })
      .catch(() => alive && setLogoUrl(null));
    return () => {
      alive = false;
    };
  }, [company?.slug]);

  return { name, logoUrl };
}
