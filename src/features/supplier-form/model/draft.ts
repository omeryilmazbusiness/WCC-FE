import {
  CREDENTIAL_KEYS,
  DEFAULT_CURRENCY,
  MAX_FREE_CANCEL_HOURS,
  MAX_MARKUP_BPS,
  PRODUCTS,
  bpsToPercent,
  parsePercent,
  type CredentialKey,
  type Environment,
  type IntegrationType,
  type Markups,
  type PaymentModel,
  type PaymentTerms,
  type Product,
  type Region,
  type Supplier,
  type SupplierCategory,
  type SupplierInput,
} from "@/entities/supplier";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";

/** Form state: numbers stay strings until submit so partial typing never jumps. */
export type SupplierDraft = {
  code: string;
  nameEn: string;
  nameAr: string;
  category: SupplierCategory;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  emergencyPhone: string;
  integrationType: IntegrationType;
  environment: Environment;
  apiBaseUrl: string;
  webhookUrl: string;
  /** Newly typed secrets; empty means "keep what is stored". */
  credentials: Record<CredentialKey, string>;
  /** Stored secrets the user asked to remove. */
  clearCredentials: Record<CredentialKey, boolean>;
  paymentModel: PaymentModel;
  currency: string;
  creditLimit: string;
  lowBalanceThreshold: string;
  paymentTerms: PaymentTerms;
  markups: Record<Product, string>;
  regions: Region[];
  freeCancelHours: string;
  contractStart: string;
  contractEnd: string;
  terms: string;
  isActive: boolean;
};

export type SupplierDraftField =
  | "code"
  | "nameEn"
  | "category"
  | "contactPhone"
  | "contactEmail"
  | "emergencyPhone"
  | "apiBaseUrl"
  | "webhookUrl"
  | "credentials"
  | "paymentModel"
  | "currency"
  | "creditLimit"
  | "lowBalanceThreshold"
  | "markups"
  | "freeCancelHours"
  | "contractStart"
  | "contractEnd";

export type SupplierDraftErrors = Partial<Record<SupplierDraftField, string>>;

/** API field → draft field, for server-side validation details. */
export const SERVER_FIELD: Record<string, SupplierDraftField> = {
  code: "code",
  name_en: "nameEn",
  name_ar: "nameEn",
  category: "category",
  contact_phone: "contactPhone",
  contact_email: "contactEmail",
  emergency_phone: "emergencyPhone",
  api_base_url: "apiBaseUrl",
  webhook_url: "webhookUrl",
  credentials: "credentials",
  payment_model: "paymentModel",
  currency: "currency",
  credit_limit: "creditLimit",
  low_balance_threshold: "lowBalanceThreshold",
  markups: "markups",
  free_cancel_hours: "freeCancelHours",
  contract_start: "contractStart",
  contract_end: "contractEnd",
};

const CODE = /^[A-Z0-9][A-Z0-9-]{1,39}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9 ()-]{5,19}$/;
const CURRENCY = /^[A-Z]{3}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CREDENTIAL = 4096;

const blank = <T>(v: T) => Object.fromEntries(CREDENTIAL_KEYS.map((k) => [k, v])) as Record<CredentialKey, T>;
const noMarkups = () => Object.fromEntries(PRODUCTS.map((p) => [p, ""])) as Record<Product, string>;

export function newDraft(): SupplierDraft {
  return {
    code: "",
    nameEn: "",
    nameAr: "",
    category: "gds",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    emergencyPhone: "",
    integrationType: "api",
    environment: "sandbox",
    apiBaseUrl: "",
    webhookUrl: "",
    credentials: blank(""),
    clearCredentials: blank(false),
    paymentModel: "prepaid",
    currency: DEFAULT_CURRENCY,
    creditLimit: "",
    lowBalanceThreshold: "",
    paymentTerms: "net30",
    markups: noMarkups(),
    regions: [],
    freeCancelHours: "",
    contractStart: "",
    contractEnd: "",
    terms: "",
    isActive: true,
  };
}

export function draftFromSupplier(s: Supplier): SupplierDraft {
  const markups = noMarkups();
  for (const p of PRODUCTS) if (s.markups[p]) markups[p] = bpsToPercent(s.markups[p] ?? 0);
  return {
    code: s.code,
    nameEn: s.nameEn,
    nameAr: s.nameAr,
    category: s.category,
    contactName: s.contactName,
    contactPhone: s.contactPhone,
    contactEmail: s.contactEmail,
    emergencyPhone: s.emergencyPhone,
    integrationType: s.integration.type,
    environment: s.integration.environment,
    apiBaseUrl: s.integration.apiBaseUrl,
    webhookUrl: s.integration.webhookUrl,
    credentials: blank(""),
    clearCredentials: blank(false),
    paymentModel: s.finance.paymentModel,
    currency: s.finance.currency,
    creditLimit: s.finance.creditLimit ? minorToInput(s.finance.creditLimit) : "",
    lowBalanceThreshold: s.finance.lowBalanceThreshold ? minorToInput(s.finance.lowBalanceThreshold) : "",
    paymentTerms: s.finance.paymentTerms,
    markups,
    regions: [...s.regions],
    freeCancelHours: s.freeCancelHours ? String(s.freeCancelHours) : "",
    contractStart: s.contractStart ?? "",
    contractEnd: s.contractEnd ?? "",
    terms: s.terms,
    isActive: s.isActive,
  };
}

export function normalizeCode(v: string): string {
  return v.toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "").slice(0, 40);
}

export function isHttpsUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && Boolean(u.hostname) && !u.username && !u.password && v.length <= 500;
  } catch {
    return false;
  }
}

const money = (v: string): number | null => (v.trim() ? parseMoneyInput(v) : 0);

/** Client checks with the same rules as `Supplier.Normalize`; values are message keys. */
export function draftErrors(d: SupplierDraft): SupplierDraftErrors {
  const e: SupplierDraftErrors = {};
  if (!CODE.test(d.code.trim())) e.code = "code";
  if (!d.nameEn.trim() && !d.nameAr.trim()) e.nameEn = "name";
  if (d.contactEmail.trim() && !EMAIL.test(d.contactEmail.trim())) e.contactEmail = "email";
  if (d.contactPhone.trim() && !PHONE.test(d.contactPhone.trim())) e.contactPhone = "phone";
  if (d.emergencyPhone.trim() && !PHONE.test(d.emergencyPhone.trim())) e.emergencyPhone = "phone";
  if (d.integrationType !== "manual") {
    if (d.apiBaseUrl.trim() && !isHttpsUrl(d.apiBaseUrl.trim())) e.apiBaseUrl = "https";
    if (d.webhookUrl.trim() && !isHttpsUrl(d.webhookUrl.trim())) e.webhookUrl = "https";
  }
  if (CREDENTIAL_KEYS.some((k) => d.credentials[k].length > MAX_CREDENTIAL)) e.credentials = "credential";
  if (!CURRENCY.test(d.currency)) e.currency = "currency";
  if (d.paymentModel === "postpaid" && money(d.creditLimit) === null) e.creditLimit = "money";
  if (d.paymentModel !== "card" && money(d.lowBalanceThreshold) === null) e.lowBalanceThreshold = "money";
  for (const p of PRODUCTS) {
    const raw = d.markups[p].trim();
    if (!raw) continue;
    const bps = parsePercent(raw);
    if (bps === null || bps > MAX_MARKUP_BPS) e.markups = "markup";
  }
  const hours = d.freeCancelHours.trim();
  if (hours && (!/^\d+$/.test(hours) || Number(hours) > MAX_FREE_CANCEL_HOURS)) e.freeCancelHours = "hours";
  if (d.contractStart && !DAY.test(d.contractStart)) e.contractStart = "date";
  if (d.contractEnd && !DAY.test(d.contractEnd)) e.contractEnd = "date";
  if (!e.contractEnd && d.contractStart && d.contractEnd && d.contractEnd < d.contractStart) e.contractEnd = "dateOrder";
  return e;
}

/** Credential patch: typed value replaces, a cleared key sends "", untouched keys are omitted. */
export function credentialPatch(d: SupplierDraft): SupplierInput["credentials"] {
  const out: SupplierInput["credentials"] = {};
  for (const k of CREDENTIAL_KEYS) {
    if (d.clearCredentials[k]) out[k] = "";
    else if (d.credentials[k].trim()) out[k] = d.credentials[k].trim();
  }
  return out;
}

export function draftToInput(d: SupplierDraft): SupplierInput {
  const markups: Markups = {};
  for (const p of PRODUCTS) {
    const bps = parsePercent(d.markups[p]);
    if (bps) markups[p] = bps;
  }
  const manual = d.integrationType === "manual";
  return {
    code: normalizeCode(d.code),
    nameEn: d.nameEn.trim(),
    nameAr: d.nameAr.trim(),
    category: d.category,
    contactName: d.contactName.trim(),
    contactPhone: d.contactPhone.trim(),
    contactEmail: d.contactEmail.trim(),
    emergencyPhone: d.emergencyPhone.trim(),
    terms: d.terms.trim(),
    integrationType: d.integrationType,
    environment: d.environment,
    apiBaseUrl: manual ? "" : d.apiBaseUrl.trim(),
    webhookUrl: manual ? "" : d.webhookUrl.trim(),
    credentials: credentialPatch(d),
    paymentModel: d.paymentModel,
    currency: d.currency,
    creditLimit: d.paymentModel === "postpaid" ? (money(d.creditLimit) ?? 0) : 0,
    lowBalanceThreshold: d.paymentModel === "card" ? 0 : (money(d.lowBalanceThreshold) ?? 0),
    paymentTerms: d.paymentTerms,
    markups,
    regions: d.regions,
    freeCancelHours: Number(d.freeCancelHours.trim() || 0),
    contractStart: d.contractStart,
    contractEnd: d.contractEnd,
    isActive: d.isActive,
  };
}

/** The payment model and currency are locked while the account carries a balance. */
export function balanceLocked(s: Supplier | null | undefined): boolean {
  return Boolean(s && (s.finance.depositBalance !== 0 || s.finance.creditUsed !== 0));
}
