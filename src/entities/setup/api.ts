import { http, type HttpClient } from "@/shared/api/http-client";
import {
  SETUP_STEPS,
  type CompanyProfile,
  type SetupBranch,
  type SetupOverview,
  type SetupStep,
  type SetupStepKey,
  type SetupStepStatus,
} from "./model";

export const SETUP_PATH = "/setup";

type Raw = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function isStepKey(v: unknown): v is SetupStepKey {
  return typeof v === "string" && (SETUP_STEPS as readonly string[]).includes(v);
}

function mapStatus(v: unknown): SetupStepStatus {
  return v === "done" || v === "skipped" ? v : "pending";
}

function mapCompany(raw: unknown): CompanyProfile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Raw;
  return {
    slug: str(r.slug),
    nameEn: str(r.name_en),
    nameAr: str(r.name_ar),
    legalName: str(r.legal_name),
    phone: str(r.phone),
    email: str(r.email),
    website: str(r.website),
    country: str(r.country),
    city: str(r.city),
    address: str(r.address),
    currency: str(r.currency) || "USD",
    timezone: str(r.timezone),
  };
}

function mapBranches(raw: unknown): SetupBranch[] {
  const list = Array.isArray(raw) ? raw : [];
  const out = list
    .map((item) => (item && typeof item === "object" ? (item as Raw) : {}))
    .filter((b) => str(b.id))
    .map<SetupBranch>((b) => ({
      id: str(b.id),
      slug: str(b.slug),
      code: str(b.code),
      nameEn: str(b.name_en),
      nameAr: str(b.name_ar),
      kind: b.kind === "main_center" ? "main_center" : "branch",
    }));
  return out.sort((a, b) => Number(b.kind === "main_center") - Number(a.kind === "main_center"));
}

export function mapSetupOverview(raw: unknown): SetupOverview {
  const r = (raw && typeof raw === "object" ? raw : {}) as Raw;
  const byKey = new Map<SetupStepKey, SetupStep>();
  for (const item of Array.isArray(r.steps) ? r.steps : []) {
    const s = (item ?? {}) as Raw;
    if (isStepKey(s.key)) {
      byKey.set(s.key, { key: s.key, status: mapStatus(s.status), count: Number(s.count) || 0 });
    }
  }
  const steps = SETUP_STEPS.map((key) => byKey.get(key) ?? { key, status: "pending" as const, count: 0 });
  return {
    companyId: str(r.company_id),
    company: mapCompany(r.company),
    branches: mapBranches(r.branches),
    steps,
    nextStep: isStepKey(r.next_step) ? r.next_step : null,
    doneCount: Number(r.done_count) || 0,
    totalSteps: Number(r.total_steps) || SETUP_STEPS.length,
    completed: Boolean(r.completed),
    fullyDone: Boolean(r.fully_done),
    required: Boolean(r.required),
    completedAt: str(r.completed_at) || null,
    dismissedAt: str(r.dismissed_at) || null,
  };
}

function companyBody(c: CompanyProfile): string {
  return JSON.stringify({
    slug: c.slug,
    name_en: c.nameEn,
    name_ar: c.nameAr,
    legal_name: c.legalName,
    phone: c.phone,
    email: c.email,
    website: c.website,
    country: c.country,
    city: c.city,
    address: c.address,
    currency: c.currency,
    timezone: c.timezone,
  });
}

export type SetupRepository = {
  get(): Promise<SetupOverview>;
  saveCompany(company: CompanyProfile): Promise<SetupOverview>;
  /** `skip` is required for AI / channels that are not configured yet. */
  advance(step: SetupStepKey, skip?: boolean): Promise<SetupOverview>;
  complete(): Promise<SetupOverview>;
  dismiss(): Promise<SetupOverview>;
};

/** Setup endpoints need `setup.manage` (GM only). */
export function createSetupRepository(client: HttpClient = http): SetupRepository {
  const send = async (path: string, init?: Parameters<HttpClient["request"]>[1]) =>
    mapSetupOverview(await client.request<unknown>(`${SETUP_PATH}${path}`, init));
  return {
    get: () => send(""),
    saveCompany: (company) => send("/company", { method: "PUT", body: companyBody(company) }),
    advance: (step, skip = false) =>
      send(`/steps/${step}`, { method: "POST", body: JSON.stringify({ skip }) }),
    complete: () => send("/complete", { method: "POST", body: "{}" }),
    dismiss: () => send("/dismiss", { method: "POST", body: "{}" }),
  };
}
