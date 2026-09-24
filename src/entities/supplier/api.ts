import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  ConfirmationStatus,
  Supplier,
  SupplierLink,
  SupplierLinkType,
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

type Raw = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function mapSupplier(raw: Raw): Supplier {
  return {
    id: str(raw.id),
    branchId: str(raw.branch_id ?? raw.branchId),
    code: str(raw.code),
    nameEn: str(raw.name_en ?? raw.nameEn),
    nameAr: str(raw.name_ar ?? raw.nameAr),
    contactName: str(raw.contact_name ?? raw.contactName),
    contactPhone: str(raw.contact_phone ?? raw.contactPhone),
    contactEmail: str(raw.contact_email ?? raw.contactEmail),
    terms: str(raw.terms),
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
    createdAt: str(raw.created_at ?? raw.createdAt),
    updatedAt: str(raw.updated_at ?? raw.updatedAt),
  };
}

function mapLink(raw: Raw): SupplierLink {
  const allotment = Number(raw.allotment ?? 0);
  const sold = Number(raw.sold ?? 0);
  const oversold =
    raw.oversold === true || (allotment > 0 && sold > allotment);
  return {
    id: str(raw.id),
    supplierId: str(raw.supplier_id ?? raw.supplierId),
    linkType: str(raw.link_type ?? raw.linkType) as SupplierLinkType,
    linkId: str(raw.link_id ?? raw.linkId),
    confirmationStatus: str(
      raw.confirmation_status ?? raw.confirmationStatus ?? "pending",
    ) as ConfirmationStatus,
    confirmationRef: str(raw.confirmation_ref ?? raw.confirmationRef),
    confirmedAt: (raw.confirmed_at ?? raw.confirmedAt ?? null) as string | null,
    allotment,
    sold,
    unitCost: Number(raw.unit_cost ?? raw.unitCost ?? 0),
    currency: str(raw.currency ?? "SAR"),
    notes: str(raw.notes),
    oversold,
    createdAt: str(raw.created_at ?? raw.createdAt),
    updatedAt: str(raw.updated_at ?? raw.updatedAt),
  };
}

export type CreateSupplierInput = {
  code: string;
  nameEn?: string;
  nameAr?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  terms?: string;
};

export type UpdateSupplierInput = {
  nameEn?: string;
  nameAr?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  terms?: string;
  isActive?: boolean;
};

export type CreateLinkInput = {
  linkType: SupplierLinkType;
  linkId: string;
  allotment?: number;
  unitCost?: number;
  currency?: string;
  notes?: string;
};

export interface SupplierRepository {
  list(activeOnly?: boolean): Promise<Supplier[]>;
  getById(id: string): Promise<Supplier>;
  create(input: CreateSupplierInput): Promise<Supplier>;
  update(id: string, input: UpdateSupplierInput): Promise<Supplier>;
  listLinks(supplierId: string): Promise<SupplierLink[]>;
  addLink(supplierId: string, input: CreateLinkInput): Promise<SupplierLink>;
  deleteLink(supplierId: string, linkId: string): Promise<void>;
  confirmLink(linkId: string, confirmationRef?: string): Promise<SupplierLink>;
  listUnconfirmed(): Promise<SupplierLink[]>;
  listOversold(): Promise<SupplierLink[]>;
}

class ApiRepo implements SupplierRepository {
  constructor(private readonly http: HttpClient) {}

  async list(activeOnly = false) {
    const q = activeOnly ? "?active=true" : "";
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/suppliers${q}`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapSupplier);
  }

  async getById(id: string) {
    return mapSupplier(await this.http.request<Raw>(`/suppliers/${id}`));
  }

  async create(input: CreateSupplierInput) {
    return mapSupplier(
      await this.http.request<Raw>("/suppliers", {
        method: "POST",
        body: JSON.stringify({
          code: input.code,
          name_en: input.nameEn ?? "",
          name_ar: input.nameAr ?? "",
          contact_name: input.contactName ?? "",
          contact_phone: input.contactPhone ?? "",
          contact_email: input.contactEmail ?? "",
          terms: input.terms ?? "",
        }),
      }),
    );
  }

  async update(id: string, input: UpdateSupplierInput) {
    return mapSupplier(
      await this.http.request<Raw>(`/suppliers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name_en: input.nameEn,
          name_ar: input.nameAr,
          contact_name: input.contactName,
          contact_phone: input.contactPhone,
          contact_email: input.contactEmail,
          terms: input.terms,
          is_active: input.isActive,
        }),
      }),
    );
  }

  async listLinks(supplierId: string) {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/suppliers/${supplierId}/links`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapLink);
  }

  async addLink(supplierId: string, input: CreateLinkInput) {
    return mapLink(
      await this.http.request<Raw>(`/suppliers/${supplierId}/links`, {
        method: "POST",
        body: JSON.stringify({
          link_type: input.linkType,
          link_id: input.linkId,
          allotment: input.allotment ?? 0,
          unit_cost: input.unitCost ?? 0,
          currency: input.currency ?? "SAR",
          notes: input.notes ?? "",
        }),
      }),
    );
  }

  async deleteLink(supplierId: string, linkId: string) {
    await this.http.request(`/suppliers/${supplierId}/links/${linkId}`, {
      method: "DELETE",
    });
  }

  async confirmLink(linkId: string, confirmationRef = "") {
    return mapLink(
      await this.http.request<Raw>(`/suppliers/links/${linkId}/confirm`, {
        method: "POST",
        body: JSON.stringify({ confirmation_ref: confirmationRef }),
      }),
    );
  }

  async listUnconfirmed() {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      "/suppliers/unconfirmed",
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapLink);
  }

  async listOversold() {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      "/suppliers/oversold",
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapLink);
  }
}

class MemoryRepo implements SupplierRepository {
  private suppliers: Supplier[] = [
    {
      id: "sup-1",
      branchId: "br-1",
      code: "HTL-MK",
      nameEn: "Makkah Hotels Co",
      nameAr: "فنادق مكة",
      contactName: "Ali",
      contactPhone: "+966500000001",
      contactEmail: "ali@example.com",
      terms: "Net 30",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  private links: SupplierLink[] = [
    {
      id: "lnk-1",
      supplierId: "sup-1",
      linkType: "departure",
      linkId: "11111111-1111-1111-1111-111111111111",
      confirmationStatus: "pending",
      confirmationRef: "",
      confirmedAt: null,
      allotment: 40,
      sold: 42,
      unitCost: 85000,
      currency: "SAR",
      notes: "",
      oversold: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  async list(activeOnly = false) {
    return this.suppliers.filter((s) => !activeOnly || s.isActive);
  }

  async getById(id: string) {
    const s = this.suppliers.find((x) => x.id === id);
    if (!s) throw new Error("supplier not found");
    return { ...s };
  }

  async create(input: CreateSupplierInput) {
    const now = new Date().toISOString();
    const s: Supplier = {
      id: crypto.randomUUID(),
      branchId: "br-1",
      code: input.code.toUpperCase(),
      nameEn: input.nameEn ?? "",
      nameAr: input.nameAr ?? "",
      contactName: input.contactName ?? "",
      contactPhone: input.contactPhone ?? "",
      contactEmail: input.contactEmail ?? "",
      terms: input.terms ?? "",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.suppliers.unshift(s);
    return { ...s };
  }

  async update(id: string, input: UpdateSupplierInput) {
    const s = await this.getById(id);
    if (input.nameEn != null) s.nameEn = input.nameEn;
    if (input.nameAr != null) s.nameAr = input.nameAr;
    if (input.contactName != null) s.contactName = input.contactName;
    if (input.contactPhone != null) s.contactPhone = input.contactPhone;
    if (input.contactEmail != null) s.contactEmail = input.contactEmail;
    if (input.terms != null) s.terms = input.terms;
    if (input.isActive != null) s.isActive = input.isActive;
    s.updatedAt = new Date().toISOString();
    const i = this.suppliers.findIndex((x) => x.id === id);
    this.suppliers[i] = s;
    return { ...s };
  }

  async listLinks(supplierId: string) {
    return this.links.filter((l) => l.supplierId === supplierId);
  }

  async addLink(supplierId: string, input: CreateLinkInput) {
    const now = new Date().toISOString();
    const allotment = input.allotment ?? 0;
    const sold = 0;
    const l: SupplierLink = {
      id: crypto.randomUUID(),
      supplierId,
      linkType: input.linkType,
      linkId: input.linkId,
      confirmationStatus: "pending",
      confirmationRef: "",
      confirmedAt: null,
      allotment,
      sold,
      unitCost: input.unitCost ?? 0,
      currency: input.currency ?? "SAR",
      notes: input.notes ?? "",
      oversold: allotment > 0 && sold > allotment,
      createdAt: now,
      updatedAt: now,
    };
    this.links.push(l);
    return { ...l };
  }

  async deleteLink(_supplierId: string, linkId: string) {
    this.links = this.links.filter((l) => l.id !== linkId);
  }

  async confirmLink(linkId: string, confirmationRef = "") {
    const l = this.links.find((x) => x.id === linkId)!;
    l.confirmationStatus = "confirmed";
    l.confirmationRef = confirmationRef;
    l.confirmedAt = new Date().toISOString();
    l.updatedAt = l.confirmedAt;
    return { ...l };
  }

  async listUnconfirmed() {
    return this.links.filter((l) => l.confirmationStatus === "pending");
  }

  async listOversold() {
    return this.links.filter((l) => l.oversold);
  }
}

let mem: MemoryRepo | null = null;

export function createSupplierRepository(): SupplierRepository {
  const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
  const api = new ApiRepo(http);
  if (!mem) mem = new MemoryRepo();
  const wrap =
    <A extends unknown[], R>(
      fn: (...args: A) => Promise<R>,
      fallback: (...args: A) => Promise<R>,
    ) =>
    async (...args: A) => {
      try {
        return await fn(...args);
      } catch {
        return fallback(...args);
      }
    };
  return {
    list: wrap(api.list.bind(api), mem.list.bind(mem)),
    getById: wrap(api.getById.bind(api), mem.getById.bind(mem)),
    create: wrap(api.create.bind(api), mem.create.bind(mem)),
    update: wrap(api.update.bind(api), mem.update.bind(mem)),
    listLinks: wrap(api.listLinks.bind(api), mem.listLinks.bind(mem)),
    addLink: wrap(api.addLink.bind(api), mem.addLink.bind(mem)),
    deleteLink: wrap(api.deleteLink.bind(api), mem.deleteLink.bind(mem)),
    confirmLink: wrap(api.confirmLink.bind(api), mem.confirmLink.bind(mem)),
    listUnconfirmed: wrap(
      api.listUnconfirmed.bind(api),
      mem.listUnconfirmed.bind(mem),
    ),
    listOversold: wrap(api.listOversold.bind(api), mem.listOversold.bind(mem)),
  };
}
