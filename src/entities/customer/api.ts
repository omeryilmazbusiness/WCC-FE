import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import { maskedLast4, passportPatchValue, toMaskedSecret } from "@/shared/lib/pii";
import type {
  CompanionLink,
  Customer,
  CustomerCreateInput,
  CustomerDataExport,
  CustomerUpdateInput,
  DuplicateMatch,
  TimelineItem,
} from "./model";

/** Port — features depend on this, not on fetch details (DIP). */
export interface CustomerRepository {
  search(query: string): Promise<Customer[]>;
  getById(id: string): Promise<Customer>;
  create(input: CustomerCreateInput): Promise<{ customer: Customer; duplicateWarn?: boolean; duplicates?: DuplicateMatch[] }>;
  update(id: string, input: CustomerUpdateInput): Promise<Customer>;
  merge(targetId: string, sourceId: string): Promise<Customer>;
  timeline(id: string): Promise<TimelineItem[]>;
  listCompanions(id: string): Promise<CompanionLink[]>;
  linkCompanion(id: string, companionId: string, relation: string, notes?: string): Promise<void>;
  unlinkCompanion(id: string, companionId: string): Promise<void>;
  checkDuplicates(input: Partial<CustomerCreateInput>): Promise<DuplicateMatch[]>;
  /** Full passport number (`pii.read`, audited). Never cache the result. */
  revealPassport(id: string): Promise<string>;
  /** KVKK data export bundle (`privacy.manage`). */
  exportData(id: string): Promise<CustomerDataExport>;
  /** Irreversible KVKK erasure (`privacy.manage`); 409 `customer_has_active_bookings`. */
  anonymize(id: string, reason: string): Promise<Customer>;
}

type ApiCustomer = Record<string, unknown>;

function mapCustomer(raw: ApiCustomer): Customer {
  const prefs = raw.preferences;
  const passportNo = toMaskedSecret(
    String(raw.passportNo ?? raw.passport_no ?? ""),
    (raw.passportLast4 ?? raw.passport_last4) as string | null | undefined,
  );
  return {
    id: String(raw.id),
    branchId: String(raw.branchId ?? raw.branch_id ?? ""),
    fullName: String(raw.fullName ?? raw.full_name ?? ""),
    fullNameAr: String(raw.fullNameAr ?? raw.full_name_ar ?? ""),
    phone: String(raw.phone ?? ""),
    email: String(raw.email ?? ""),
    nationality: String(raw.nationality ?? ""),
    passportNo,
    passportLast4: String(raw.passportLast4 ?? raw.passport_last4 ?? "") || maskedLast4(passportNo),
    dateOfBirth: (raw.dateOfBirth ?? raw.date_of_birth ?? null) as string | null,
    passportExpiresAt: (raw.passportExpiresAt ?? raw.passport_expires_at ?? null) as string | null,
    preferences:
      prefs && typeof prefs === "object" && !Array.isArray(prefs)
        ? (prefs as Record<string, unknown>)
        : {},
    specialRequirements: String(
      raw.specialRequirements ?? raw.special_requirements ?? "",
    ),
    notes: String(raw.notes ?? ""),
    mergedIntoId: (raw.mergedIntoId ?? raw.merged_into_id ?? null) as string | null,
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
    anonymizedAt: (raw.anonymizedAt ?? raw.anonymized_at ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
  };
}

function mapDup(raw: Record<string, unknown>): DuplicateMatch {
  const c = raw.Customer ?? raw.customer;
  return {
    customer: mapCustomer((c ?? {}) as ApiCustomer),
    reasons: (raw.Reasons ?? raw.reasons ?? []) as string[],
    score: Number(raw.Score ?? raw.score ?? 0),
  };
}

export class ApiCustomerRepository implements CustomerRepository {
  constructor(private readonly http: HttpClient) {}

  async search(query: string): Promise<Customer[]> {
    const q = encodeURIComponent(query);
    const data = await this.http.request<ApiCustomer[]>(`/customers?q=${q}&limit=50`);
    return (Array.isArray(data) ? data : []).map(mapCustomer);
  }

  async getById(id: string): Promise<Customer> {
    return mapCustomer(await this.http.request<ApiCustomer>(`/customers/${id}`));
  }

  async create(input: CustomerCreateInput) {
    // raw() keeps the envelope so duplicate-warning `meta` survives
    const res = await this.http.raw("/customers", {
      method: "POST",
      body: JSON.stringify({
        full_name: input.fullName,
        full_name_ar: input.fullNameAr ?? "",
        phone: input.phone,
        email: input.email ?? "",
        nationality: input.nationality ?? "",
        passport_no: input.passportNo ?? "",
        date_of_birth: input.dateOfBirth || null,
        passport_expires_at: input.passportExpiresAt || null,
        special_requirements: input.specialRequirements ?? "",
        notes: input.notes ?? "",
      }),
    });
    const payload = await res.json().catch(() => ({}));
    const customer = mapCustomer(payload.data ?? payload);
    const dups = (payload.meta?.duplicates ?? []).map((d: Record<string, unknown>) => mapDup(d));
    return {
      customer,
      duplicateWarn: Boolean(payload.meta?.duplicate_warn),
      duplicates: dups,
    };
  }

  async update(id: string, input: CustomerUpdateInput): Promise<Customer> {
    const raw = await this.http.request<ApiCustomer>(`/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        full_name: input.fullName,
        full_name_ar: input.fullNameAr,
        phone: input.phone,
        email: input.email,
        nationality: input.nationality,
        passport_no: passportPatchValue(input.passportNo),
        date_of_birth: input.dateOfBirth,
        clear_dob: input.clearDob,
        passport_expires_at: input.passportExpiresAt,
        clear_passport_expires_at: input.clearPassportExpiry,
        special_requirements: input.specialRequirements,
        notes: input.notes,
        preferences: input.preferences,
      }),
    });
    return mapCustomer(raw);
  }

  async merge(targetId: string, sourceId: string): Promise<Customer> {
    return mapCustomer(
      await this.http.request<ApiCustomer>(`/customers/${targetId}/merge`, {
        method: "POST",
        body: JSON.stringify({ source_id: sourceId }),
      }),
    );
  }

  async timeline(id: string): Promise<TimelineItem[]> {
    const data = await this.http.request<TimelineItem[]>(`/customers/${id}/timeline?limit=50`);
    return Array.isArray(data) ? data : [];
  }

  async listCompanions(id: string): Promise<CompanionLink[]> {
    const data = await this.http.request<CompanionLink[]>(`/customers/${id}/companions`);
    return Array.isArray(data) ? data : [];
  }

  async linkCompanion(id: string, companionId: string, relation: string, notes = "") {
    await this.http.request(`/customers/${id}/companions`, {
      method: "POST",
      body: JSON.stringify({ companion_id: companionId, relation, notes }),
    });
  }

  async unlinkCompanion(id: string, companionId: string) {
    await this.http.request(`/customers/${id}/companions/${companionId}`, {
      method: "DELETE",
    });
  }

  async checkDuplicates(input: Partial<CustomerCreateInput>): Promise<DuplicateMatch[]> {
    const sp = new URLSearchParams();
    if (input.fullName) sp.set("full_name", input.fullName);
    if (input.phone) sp.set("phone", input.phone);
    if (input.email) sp.set("email", input.email);
    const passport = passportPatchValue(input.passportNo);
    if (passport) sp.set("passport_no", passport);
    const data = await this.http.request<Record<string, unknown>[]>(
      `/customers/duplicates?${sp.toString()}`,
    );
    return (Array.isArray(data) ? data : []).map(mapDup);
  }

  async revealPassport(id: string): Promise<string> {
    const data = await this.http.request<{ passport_no?: string }>(
      `/customers/${id}/reveal-passport`,
      { method: "POST", body: JSON.stringify({}) },
    );
    return String(data?.passport_no ?? "");
  }

  async exportData(id: string): Promise<CustomerDataExport> {
    return this.http.request<CustomerDataExport>(`/customers/${id}/export`);
  }

  async anonymize(id: string, reason: string): Promise<Customer> {
    return mapCustomer(
      await this.http.request<ApiCustomer>(`/customers/${id}/anonymize`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    );
  }
}

const memoryStore: Customer[] = [
  {
    id: "demo-1",
    branchId: "11111111-1111-1111-1111-111111111111",
    fullName: "Ahmed Al-Rashid",
    fullNameAr: "أحمد الراشد",
    phone: "+966500000001",
    email: "ahmed@example.com",
    nationality: "SA",
    passportNo: "••••5678",
    passportLast4: "5678",
    dateOfBirth: "1990-05-12",
    preferences: { language: "ar" },
    specialRequirements: "Wheelchair assist",
    notes: "Demo customer for Customer 360",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    branchId: "11111111-1111-1111-1111-111111111111",
    fullName: "Fatima Al-Rashid",
    fullNameAr: "فاطمة الراشد",
    phone: "+966500000002",
    email: "",
    nationality: "SA",
    passportNo: "",
    passportLast4: "",
    notes: "Family companion demo",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let memoryCompanions: CompanionLink[] = [
  {
    id: "cl-1",
    customer_id: "demo-1",
    companion_id: "demo-2",
    relation: "spouse",
    notes: "",
    companion: { id: "demo-2", full_name: "Fatima Al-Rashid", phone: "+966500000002" },
  },
];

/** In-memory stub for offline skeleton / local demos. */
export class MemoryCustomerRepository implements CustomerRepository {
  async search(query: string): Promise<Customer[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [...memoryStore];
    return memoryStore.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.fullNameAr.includes(q) ||
        c.phone.includes(q),
    );
  }

  async getById(id: string): Promise<Customer> {
    const found = memoryStore.find((c) => c.id === id);
    if (!found) throw new Error("Customer not found");
    return found;
  }

  async create(input: CustomerCreateInput) {
    const dup = memoryStore.find((c) => c.phone === input.phone);
    const c: Customer = {
      id: crypto.randomUUID(),
      branchId: "11111111-1111-1111-1111-111111111111",
      fullName: input.fullName,
      fullNameAr: input.fullNameAr ?? "",
      phone: input.phone,
      email: input.email ?? "",
      nationality: input.nationality ?? "",
      passportNo: toMaskedSecret(input.passportNo),
      passportLast4: maskedLast4(toMaskedSecret(input.passportNo)),
      dateOfBirth: input.dateOfBirth,
      passportExpiresAt: input.passportExpiresAt ?? null,
      specialRequirements: input.specialRequirements ?? "",
      notes: input.notes ?? "",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.unshift(c);
    return {
      customer: c,
      duplicateWarn: Boolean(dup),
      duplicates: dup
        ? [{ customer: dup, reasons: ["phone"], score: 100 }]
        : [],
    };
  }

  async update(id: string, input: CustomerUpdateInput): Promise<Customer> {
    const idx = memoryStore.findIndex((c) => c.id === id);
    if (idx < 0) throw new Error("Customer not found");
    const passport = passportPatchValue(input.passportNo);
    const passportNo = passport ? toMaskedSecret(passport) : undefined;
    memoryStore[idx] = {
      ...memoryStore[idx],
      ...Object.fromEntries(
        Object.entries({
          fullName: input.fullName,
          fullNameAr: input.fullNameAr,
          phone: input.phone,
          email: input.email,
          nationality: input.nationality,
          passportNo,
          passportLast4: passportNo ? maskedLast4(passportNo) : undefined,
          dateOfBirth: input.clearDob ? null : input.dateOfBirth,
          passportExpiresAt: input.clearPassportExpiry ? null : input.passportExpiresAt,
          specialRequirements: input.specialRequirements,
          notes: input.notes,
        }).filter(([, v]) => v !== undefined),
      ),
      updatedAt: new Date().toISOString(),
    } as Customer;
    return memoryStore[idx];
  }

  async merge(targetId: string, sourceId: string): Promise<Customer> {
    const target = await this.getById(targetId);
    const srcIdx = memoryStore.findIndex((c) => c.id === sourceId);
    if (srcIdx >= 0) {
      memoryStore[srcIdx] = {
        ...memoryStore[srcIdx],
        isActive: false,
        mergedIntoId: targetId,
      };
    }
    return target;
  }

  async timeline(id: string): Promise<TimelineItem[]> {
    return [
      {
        kind: "note",
        id: "t1",
        title: "Customer opened",
        occurred_at: new Date().toISOString(),
        status: "info",
      },
      {
        kind: "lead",
        id: "t2",
        title: "Inquiry",
        status: "new",
        occurred_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ].filter(() => id);
  }

  async listCompanions(id: string): Promise<CompanionLink[]> {
    return memoryCompanions.filter((c) => c.customer_id === id);
  }

  async linkCompanion(id: string, companionId: string, relation: string, notes = "") {
    const companion = await this.getById(companionId);
    memoryCompanions.push({
      id: crypto.randomUUID(),
      customer_id: id,
      companion_id: companionId,
      relation,
      notes,
      companion: { id: companion.id, full_name: companion.fullName, phone: companion.phone },
    });
  }

  async unlinkCompanion(id: string, companionId: string) {
    memoryCompanions = memoryCompanions.filter(
      (c) => !(c.customer_id === id && c.companion_id === companionId),
    );
  }

  async checkDuplicates(input: Partial<CustomerCreateInput>): Promise<DuplicateMatch[]> {
    return memoryStore
      .filter((c) => input.phone && c.phone === input.phone)
      .map((c) => ({ customer: c, reasons: ["phone"], score: 100 }));
  }

  async revealPassport(): Promise<string> {
    throw new Error("Passport reveal requires the backend");
  }

  async exportData(id: string): Promise<CustomerDataExport> {
    return { customer: await this.getById(id) };
  }

  async anonymize(id: string): Promise<Customer> {
    const idx = memoryStore.findIndex((c) => c.id === id);
    if (idx < 0) throw new Error("Customer not found");
    memoryStore[idx] = {
      ...memoryStore[idx],
      fullName: "Anonymized customer",
      fullNameAr: "",
      phone: "",
      email: "",
      passportNo: "",
      passportLast4: "",
      dateOfBirth: null,
      notes: "",
      anonymizedAt: new Date().toISOString(),
    };
    return memoryStore[idx];
  }
}

export function createCustomerRepository(): CustomerRepository {
  const api = new ApiCustomerRepository(http);
  const memory = new MemoryCustomerRepository();
  return createRepository<CustomerRepository>({
    api,
    memory,
    reads: [
      "search",
      "getById",
      "timeline",
      "listCompanions",
      "checkDuplicates",
    ],
  });
}
