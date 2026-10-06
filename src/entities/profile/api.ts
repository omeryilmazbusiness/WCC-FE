import { AUTH_ENDPOINTS } from "@/shared/api/auth-contract";
import { bffHttp, http, PROXY_BASE_PATH } from "@/shared/api/http-client";
import type { ViewerSession } from "@/shared/api/session";
import { isAppRole } from "@/shared/config/routes";
import type { PersonalInfo, Profile } from "./model";

type ApiProfile = {
  id: string;
  email: string;
  full_name: string;
  job_title: string;
  phone: string;
  role: string;
  branch_id: string | null;
  team: { id: string; name_en: string; name_ar: string } | null;
  mfa_enabled: boolean;
  avatar_version: string | null;
  created_at: string;
  updated_at: string;
};

export const PROFILE_ENDPOINTS = {
  profile: "/me/profile",
  email: "/me/email",
  avatar: "/me/avatar",
} as const;

export function mapProfile(p: ApiProfile): Profile {
  return {
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    jobTitle: p.job_title ?? "",
    phone: p.phone ?? "",
    role: isAppRole(p.role) ? p.role : "employee",
    branchId: p.branch_id,
    team: p.team ? { id: p.team.id, nameEn: p.team.name_en, nameAr: p.team.name_ar } : null,
    mfaEnabled: p.mfa_enabled,
    avatarVersion: p.avatar_version,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export async function getProfile(): Promise<Profile> {
  return mapProfile(await http.request<ApiProfile>(PROFILE_ENDPOINTS.profile));
}

export async function updateProfile(changes: Partial<PersonalInfo>): Promise<Profile> {
  const body: Record<string, string> = {};
  if (changes.fullName !== undefined) body.full_name = changes.fullName;
  if (changes.jobTitle !== undefined) body.job_title = changes.jobTitle;
  if (changes.phone !== undefined) body.phone = changes.phone;
  return mapProfile(
    await http.request<ApiProfile>(PROFILE_ENDPOINTS.profile, { method: "PATCH", body: JSON.stringify(body) }),
  );
}

export async function changeEmail(email: string, password: string): Promise<Profile> {
  return mapProfile(
    await http.request<ApiProfile>(PROFILE_ENDPOINTS.email, { method: "PUT", body: JSON.stringify({ email: email.trim(), password }) }),
  );
}

export async function uploadAvatar(image: Blob): Promise<Profile> {
  return mapProfile(
    await http.request<ApiProfile>(PROFILE_ENDPOINTS.avatar, {
      method: "PUT",
      body: image,
      headers: { "Content-Type": image.type || "application/octet-stream" },
    }),
  );
}

export async function deleteAvatar(): Promise<Profile> {
  return mapProfile(await http.request<ApiProfile>(PROFILE_ENDPOINTS.avatar, { method: "DELETE" }));
}

/** Goes through the BFF route so the replacement tokens stay in HttpOnly cookies. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<ViewerSession> {
  const res = await bffHttp.request<{ ok: true; viewer: ViewerSession }>(AUTH_ENDPOINTS.password, {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  return res.viewer;
}

/** Same-origin photo URL; the version busts caches after every upload. */
export function avatarUrl(version: string): string {
  return `${PROXY_BASE_PATH}${PROFILE_ENDPOINTS.avatar}?v=${encodeURIComponent(version)}`;
}
