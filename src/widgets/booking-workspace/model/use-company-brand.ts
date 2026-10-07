"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { companyDisplayName, companyLogoUrl, useCompanyBranding } from "@/entities/company-branding";
import { useViewer } from "@/entities/viewer";
import type { CompanyBrand } from "./document-data";

/** The viewer's agency name and absolute logo URL for documents and messages. */
export function useCompanyBrand(): CompanyBrand {
  const locale = useLocale();
  const company = useViewer().workspace?.company;
  const name = company ? companyDisplayName(company, locale) : "";
  const branding = useCompanyBranding(company?.slug);
  const logoUrl = useMemo(() => {
    const path = branding ? companyLogoUrl(branding) : null;
    return path ? new URL(path, window.location.origin).toString() : null;
  }, [branding]);

  return { name, logoUrl };
}
