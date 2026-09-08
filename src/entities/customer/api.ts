import type { HttpClient } from "@/shared/api/http-client";
import type { Customer, CustomerCreateInput } from "./model";

/** Port — features depend on this, not on fetch details (DIP). */
export interface CustomerRepository {
  search(query: string): Promise<Customer[]>;
  getById(id: string): Promise<Customer>;
  create(input: CustomerCreateInput): Promise<Customer>;
}

type ApiCustomer = {
  id: string;
  branch_id?: string;
  branchId?: string;
  full_name?: string;
  fullName?: string;
  full_name_ar?: string;
  fullNameAr?: string;
  phone: string;
  email?: string;
  nationality?: string;
  notes?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

function mapCustomer(raw: ApiCustomer): Customer {
  return {
    id: raw.id,
    branchId: raw.branchId ?? raw.branch_id ?? "",
    fullName: raw.fullName ?? raw.full_name ?? "",
    fullNameAr: raw.fullNameAr ?? raw.full_name_ar ?? "",
    phone: raw.phone,
    email: raw.email ?? "",
    nationality: raw.nationality ?? "",
    notes: raw.notes ?? "",
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? "",
  };
}

export class ApiCustomerRepository implements CustomerRepository {
  constructor(private readonly http: HttpClient) {}

  async search(query: string): Promise<Customer[]> {
    const q = encodeURIComponent(query);
    const data = await this.http.request<ApiCustomer[] | { items?: ApiCustomer[] }>(
      `/customers?q=${q}&limit=50`,
    );
    const list = Array.isArray(data) ? data : (data.items ?? []);
    return list.map(mapCustomer);
  }

  async getById(id: string): Promise<Customer> {
    const raw = await this.http.request<ApiCustomer>(`/customers/${id}`);
    return mapCustomer(raw);
  }

  async create(input: CustomerCreateInput): Promise<Customer> {
    const raw = await this.http.request<ApiCustomer>("/customers", {
      method: "POST",
      body: JSON.stringify({
        full_name: input.fullName,
        full_name_ar: input.fullNameAr ?? "",
        phone: input.phone,
        email: input.email ?? "",
        nationality: input.nationality ?? "",
        notes: input.notes ?? "",
      }),
    });
    return mapCustomer(raw);
  }
}

/** Module-level store so list + detail share demo data in skeleton mode. */
const memoryStore: Customer[] = [
  {
    id: "demo-1",
    branchId: "11111111-1111-1111-1111-111111111111",
    fullName: "Ahmed Al-Rashid",
    fullNameAr: "أحمد الراشد",
    phone: "+966500000001",
    email: "ahmed@example.com",
    nationality: "SA",
    notes: "Demo customer for F4 skeleton",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

  async create(input: CustomerCreateInput): Promise<Customer> {
    const c: Customer = {
      id: crypto.randomUUID(),
      branchId: "11111111-1111-1111-1111-111111111111",
      fullName: input.fullName,
      fullNameAr: input.fullNameAr ?? "",
      phone: input.phone,
      email: input.email ?? "",
      nationality: input.nationality ?? "",
      notes: input.notes ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.unshift(c);
    return c;
  }
}
