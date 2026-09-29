import { isPermission, type AccessScope } from "@/shared/config/permissions";
import { isAppRole } from "@/shared/config/routes";
import type { SessionBranch, SessionWorkspace, ViewerSession } from "../session";
import { sessionSecret } from "./server-env";

// Web Crypto only: this module runs in both the Edge middleware and Node route handlers.

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SCOPES: readonly AccessScope[] = ["own", "team", "branch", "company", "global"];

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(session: ViewerSession): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function parseWorkspace(raw: unknown): SessionWorkspace | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const company = r.company as Record<string, unknown> | undefined;
  if (!company || !str(company.id) || !str(company.slug) || !Array.isArray(r.branches)) return undefined;
  const branches: SessionBranch[] = r.branches
    .filter((b): b is Record<string, unknown> => Boolean(b) && typeof b === "object")
    .filter((b) => str(b.id) && str(b.slug))
    .map((b) => ({
      id: str(b.id),
      slug: str(b.slug),
      code: str(b.code),
      nameEn: str(b.nameEn),
      nameAr: str(b.nameAr),
      kind: b.kind === "main_center" ? "main_center" : "branch",
    }));
  if (branches.length === 0) return undefined;
  return {
    company: { id: str(company.id), slug: str(company.slug), nameEn: str(company.nameEn), nameAr: str(company.nameAr) },
    homeBranchId: str(r.homeBranchId),
    branches,
  };
}

function parseSession(raw: unknown): ViewerSession | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const user = r.user as Record<string, unknown> | undefined;
  if (!user || typeof user.id !== "string" || !isAppRole(user.role)) return null;
  if (typeof r.expiresAt !== "number" || r.expiresAt <= Date.now()) return null;
  const scope = SCOPES.includes(r.scope as AccessScope) ? (r.scope as AccessScope) : "own";
  return {
    user: {
      id: user.id,
      email: String(user.email ?? ""),
      fullName: String(user.fullName ?? ""),
      role: user.role,
      branchId: String(user.branchId ?? ""),
      teamId: (user.teamId as string | null | undefined) ?? null,
      mfaEnabled: Boolean(user.mfaEnabled),
    },
    permissions: Array.isArray(r.permissions) ? r.permissions.filter(isPermission) : [],
    scope,
    workspace: parseWorkspace(r.workspace),
    expiresAt: r.expiresAt,
    mfaEnrollmentRequired: Boolean(r.mfaEnrollmentRequired),
    demo: Boolean(r.demo),
  };
}

export async function verifySession(token: string | undefined | null): Promise<ViewerSession | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      fromBase64Url(signature),
      encoder.encode(payload),
    );
    if (!valid) return null;
    return parseSession(JSON.parse(decoder.decode(fromBase64Url(payload))));
  } catch {
    return null;
  }
}
