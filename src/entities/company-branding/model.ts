/** A company's public sign-in identity (`GET /v1/public/companies/{slug}`). */
export type CompanyBranding = {
  slug: string;
  nameEn: string;
  nameAr: string;
  /** Changes with every logo upload; `null` when the company has no logo. */
  logoVersion: string | null;
};

export function mapCompanyBranding(raw: unknown): CompanyBranding {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const version = str(r.logo_version);
  return {
    slug: str(r.slug),
    nameEn: str(r.name_en),
    nameAr: str(r.name_ar),
    logoVersion: r.has_logo === true && version ? version : null,
  };
}

/** Same-origin, cache-forever logo URL (the version busts it on upload). */
export function companyLogoUrl(branding: Pick<CompanyBranding, "slug" | "logoVersion">): string | null {
  if (!branding.logoVersion) return null;
  return `/api/public/companies/${encodeURIComponent(branding.slug)}/logo?v=${encodeURIComponent(branding.logoVersion)}`;
}

export function companyDisplayName(branding: Pick<CompanyBranding, "nameEn" | "nameAr">, locale: string): string {
  return (locale === "ar" && branding.nameAr) || branding.nameEn || branding.nameAr;
}
