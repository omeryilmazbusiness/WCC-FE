import { http, type HttpClient } from "@/shared/api/http-client";
import { mapCompanyBranding, type CompanyBranding } from "./model";

export const LOGO_MAX_BYTES = 512 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type LogoProblem = "type" | "size";

/** Client-side pre-check; the backend re-checks by sniffing the bytes. */
export function logoProblem(file: Pick<File, "type" | "size">): LogoProblem | null {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return "type";
  if (file.size > LOGO_MAX_BYTES) return "size";
  return null;
}

export type CompanyBrandingApi = {
  get(slug: string): Promise<CompanyBranding>;
  /** Needs `setup.manage`; the body is the raw image. */
  uploadLogo(file: Blob): Promise<CompanyBranding>;
  removeLogo(): Promise<CompanyBranding>;
  /** Platform console: any company's logo (`companies.manage`). */
  uploadCompanyLogo(companyId: string, file: Blob): Promise<CompanyBranding>;
};

export function createCompanyBrandingApi(client: HttpClient = http): CompanyBrandingApi {
  return {
    get: async (slug) =>
      mapCompanyBranding(await client.request<unknown>(`/public/companies/${encodeURIComponent(slug)}`)),
    uploadLogo: async (file) =>
      mapCompanyBranding(
        await client.request<unknown>("/setup/company/logo", {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        }),
      ),
    removeLogo: async () =>
      mapCompanyBranding(await client.request<unknown>("/setup/company/logo", { method: "DELETE" })),
    uploadCompanyLogo: async (companyId, file) =>
      mapCompanyBranding(
        await client.request<unknown>(`/platform/companies/${encodeURIComponent(companyId)}/logo`, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        }),
      ),
  };
}
