/** Leaflet locale. Matches `GET /packages/{id}/brochure.pdf?lang=`. */
export const BROCHURE_LANGS = ["en", "ar"] as const;
export type BrochureLang = (typeof BROCHURE_LANGS)[number];

export function parseBrochureLang(raw: string | null | undefined): BrochureLang {
  return raw?.toLowerCase() === "ar" ? "ar" : "en";
}

const FILE_SAFE = /[^A-Z0-9]+/g;

/** `UMR-2026-ECO-01-brochure-en.pdf` — keep in lockstep with the backend. */
export function brochureFilename(code: string, lang: BrochureLang): string {
  const safe = code
    .toUpperCase()
    .trim()
    .replace(FILE_SAFE, "-")
    .replace(/^-|-$/g, "");
  return `${safe || "PACKAGE"}-brochure-${lang}.pdf`;
}

export function brochurePath(packageId: string, lang: BrochureLang): string {
  return `/packages/${packageId}/brochure?lang=${lang}`;
}
