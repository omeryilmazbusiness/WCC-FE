import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import {
  VEHICLE_CLASSES,
  emptyBusCompanyInput,
  type BusCompany,
  type BusCompanyInput,
  type BusListFilter,
  type VehicleClass,
} from "./model";

export interface BusRepository {
  list(filter?: BusListFilter): Promise<BusCompany[]>;
  get(id: string): Promise<BusCompany>;
  create(input: BusCompanyInput): Promise<BusCompany>;
  update(id: string, input: BusCompanyInput): Promise<BusCompany>;
}

type Raw = Record<string, unknown>;

const obj = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : v == null ? d : String(v));
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
  (allowed as readonly string[]).includes(str(v)) ? (str(v) as T) : d;

export function mapBusCompany(raw: Raw): BusCompany {
  return {
    id: str(raw.id),
    branchId: str(raw.branch_id),
    name: str(raw.name),
    phone: str(raw.phone),
    email: str(raw.email),
    website: str(raw.website),
    country: str(raw.country),
    city: str(raw.city),
    address: str(raw.address),
    vehicleClass: pick(raw.vehicle_class, VEHICLE_CLASSES, "standard"),
    licenseNo: str(raw.license_no),
    contactName: str(raw.contact_name),
    contactPhone: str(raw.contact_phone),
    notes: str(raw.notes),
    isActive: Boolean(raw.is_active),
    createdAt: str(raw.created_at),
    updatedAt: str(raw.updated_at),
  };
}

export function busPayload(input: BusCompanyInput): Raw {
  return {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    website: input.website.trim(),
    country: input.country.trim(),
    city: input.city.trim(),
    address: input.address.trim(),
    vehicle_class: input.vehicleClass,
    license_no: input.licenseNo.trim(),
    contact_name: input.contactName.trim(),
    contact_phone: input.contactPhone.trim(),
    notes: input.notes.trim(),
    is_active: input.isActive,
  };
}

export class ApiBusRepository implements BusRepository {
  private readonly client: HttpClient;
  constructor(client: HttpClient = http) {
    this.client = client;
  }

  private base(id?: string) {
    return id ? `/buses/${encodeURIComponent(id)}` : "/buses";
  }

  async list(filter: BusListFilter = {}) {
    const qs = new URLSearchParams();
    if (filter.query?.trim()) qs.set("q", filter.query.trim());
    if (filter.activeOnly) qs.set("active", "true");
    const q = qs.toString();
    const rows = await this.client.request<Raw[]>(`${this.base()}${q ? `?${q}` : ""}`);
    return list(rows).map((r) => mapBusCompany(obj(r)));
  }

  async get(id: string) {
    return mapBusCompany(await this.client.request<Raw>(this.base(id)));
  }

  async create(input: BusCompanyInput) {
    return mapBusCompany(await this.client.request<Raw>(this.base(), { method: "POST", body: JSON.stringify(busPayload(input)) }));
  }

  async update(id: string, input: BusCompanyInput) {
    return mapBusCompany(await this.client.request<Raw>(this.base(id), { method: "PUT", body: JSON.stringify(busPayload(input)) }));
  }
}

function memoryId() {
  return `bus-${Math.random().toString(36).slice(2, 10)}`;
}

export class MemoryBusRepository implements BusRepository {
  private items: BusCompany[];
  constructor(items: BusCompany[] = []) {
    this.items = items;
  }

  async list(filter: BusListFilter = {}) {
    const q = filter.query?.trim().toLowerCase() ?? "";
    return this.items.filter((c) => {
      if (filter.activeOnly && !c.isActive) return false;
      if (!q) return true;
      return [c.name, c.city, c.phone, c.contactName].join(" ").toLowerCase().includes(q);
    });
  }

  async get(id: string) {
    const c = this.items.find((x) => x.id === id);
    if (!c) throw new Error("bus company not found");
    return c;
  }

  async create(input: BusCompanyInput) {
    const now = new Date().toISOString();
    const c: BusCompany = {
      ...input,
      id: memoryId(),
      branchId: "demo",
      createdAt: now,
      updatedAt: now,
      vehicleClass: input.vehicleClass,
    };
    this.items = [c, ...this.items];
    return c;
  }

  async update(id: string, input: BusCompanyInput) {
    const i = this.items.findIndex((x) => x.id === id);
    if (i < 0) throw new Error("bus company not found");
    const next = { ...this.items[i], ...input, updatedAt: new Date().toISOString() };
    this.items = this.items.map((x, n) => (n === i ? next : x));
    return next;
  }
}

export function createBusRepository(client: HttpClient = http): BusRepository {
  return createRepository<BusRepository>({
    api: new ApiBusRepository(client),
    memory: new MemoryBusRepository([
      {
        ...emptyBusCompanyInput(),
        id: "demo-kamil",
        branchId: "demo",
        name: "Kamil Koç",
        phone: "+90 212 111 22 33",
        city: "Istanbul",
        country: "Turkey",
        vehicleClass: "vip" as VehicleClass,
        contactName: "Desk",
        createdAt: "",
        updatedAt: "",
      },
    ]),
    reads: ["list", "get"],
  });
}
