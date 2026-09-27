import { bffHttp } from "@/shared/api/http-client";
import type { ViewerSession } from "@/shared/api/session";

/** BFF re-reads `/v1/auth/me` and re-signs the session cookie. */
export function fetchViewer(): Promise<ViewerSession> {
  return bffHttp.request<ViewerSession>("/auth/me");
}
