import { env } from "@/shared/config/env";
import { ApiError, FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  CompanionLink,
  Customer,
  CustomerCreateInput,
  CustomerUpdateInput,
  DuplicateMatch,
  TimelineItem,
} from "./model";

function tokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const session = parseSession(raw ? decodeURIComponent(raw) : null);
  return session?.accessToken ?? null;
}

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
}

type ApiCustomer = Record<string, unknown>;

function mapCustomer(raw: ApiCustomer): Customer {
  const prefs = raw.preferences;
  return {
    id: String(raw.id),
    branchId: String(raw.branchId ?? raw.branch_id ?? ""),
    fullName: String(raw.fullName ?? raw.full_name ?? ""),
    fullNameAr: String(raw.fullNameAr ?? raw.full_name_ar ?? ""),
    phone: String(raw.phone ?? ""),
    email: String(raw.email ?? ""),
    nationality: String(raw.nationality ?? ""),
    passportNo: String(raw.passportNo ?? raw.passport_no ?? ""),
    dateOfBirth: (raw.dateOfBirth ?? raw.date_of_birth ?? null) as string | null,
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
    // FetchHttpClient returns data only; meta is dropped — call fetch for meta
    const token = tokenFromCookie();
    const res = await fetch(`${env.apiBaseUrl}/customers`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        full_name: input.fullName,
        full_name_ar: input.fullNameAr ?? "",
        phone: input.phone,
        email: input.email ?? "",
        nationality: input.nationality ?? "",
        passport_no: input.passportNo ?? "",
        date_of_birth: input.dateOfBirth || null,
        special_requirements: input.specialRequirements ?? "",
        notes: input.notes ?? "",
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(payload?.error?.message ?? res.statusText, res.status, payload?.error?.code);
    }
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
        passport_no: input.passportNo,
        date_of_birth: input.dateOfBirth,
        clear_dob: input.clearDob,
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
    if (input.passportNo) sp.set("passport_no", input.passportNo);
    const data = await this.http.request<Record<string, unknown>[]>(
      `/customers/duplicates?${sp.toString()}`,
    );
    return (Array.isArray(data) ? data : []).map(mapDup);
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
    passportNo: "A12****78",
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
      passportNo: input.passportNo ?? "",
      dateOfBirth: input.dateOfBirth,
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
    memoryStore[idx] = {
      ...memoryStore[idx],
      ...Object.fromEntries(
        Object.entries({
          fullName: input.fullName,
          fullNameAr: input.fullNameAr,
          phone: input.phone,
          email: input.email,
          nationality: input.nationality,
          passportNo: input.passportNo,
          dateOfBirth: input.clearDob ? null : input.dateOfBirth,
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
}

export function createCustomerRepository(): CustomerRepository {
  const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
  const api = new ApiCustomerRepository(http);
  const memory = new MemoryCustomerRepository();
  return {
    async search(q) {
      try {
        return await api.search(q);
      } catch {
        return memory.search(q);
      }
    },
    async getById(id) {
      try {
        return await api.getById(id);
      } catch {
        return memory.getById(id);
      }
    },
    async create(input) {
      try {
        return await api.create(input);
      } catch {
        return memory.create(input);
      }
    },
    async update(id, input) {
      try {
        return await api.update(id, input);
      } catch {
        return memory.update(id, input);
      }
    },
    async merge(t, s) {
      try {
        return await api.merge(t, s);
      } catch {
        return memory.merge(t, s);
      }
    },
    async timeline(id) {
      try {
        return await api.timeline(id);
      } catch {
        return memory.timeline(id);
      }
    },
    async listCompanions(id) {
      try {
        return await api.listCompanions(id);
      } catch {
        return memory.listCompanions(id);
      }
    },
    async linkCompanion(id, c, r, n) {
      try {
        return await api.linkCompanion(id, c, r, n);
      } catch {
        return memory.linkCompanion(id, c, r, n);
      }
    },
    async unlinkCompanion(id, c) {
      try {
        return await api.unlinkCompanion(id, c);
      } catch {
        return memory.unlinkCompanion(id, c);
      }
    },
    async checkDuplicates(input) {
      try {
        return await api.checkDuplicates(input);
      } catch {
        return memory.checkDuplicates(input);
      }
    },
  };
}
