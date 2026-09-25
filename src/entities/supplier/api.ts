import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  ConfirmationStatus,
  CreateIssueInput,
  IssueEvent,
  Supplier,
  SupplierInvoice,
  SupplierInvoiceLine,
  SupplierInvoiceStatus,
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

function mapInvoiceLine(raw: Raw): SupplierInvoiceLine {
  const quantity = Number(raw.quantity ?? 0);
  const unitCost = Number(raw.unit_cost ?? raw.unitCost ?? 0);
  const lineTotal = Number(
    raw.line_total ?? raw.lineTotal ?? quantity * unitCost,
  );
  return {
    id: str(raw.id),
    description: str(raw.description),
    quantity,
    unitCost,
    linkId: (raw.link_id ?? raw.linkId ?? null) as string | null,
    lineTotal,
  };
}

function mapInvoice(raw: Raw): SupplierInvoice {
  const linesRaw = Array.isArray(raw.lines) ? (raw.lines as Raw[]) : [];
  const lines = linesRaw.map(mapInvoiceLine);
  const subtotal = Number(
    raw.subtotal ?? lines.reduce((s, l) => s + l.lineTotal, 0),
  );
  const taxTotal = Number(raw.tax_total ?? raw.taxTotal ?? 0);
  return {
    id: str(raw.id),
    supplierId: str(raw.supplier_id ?? raw.supplierId),
    branchId: str(raw.branch_id ?? raw.branchId),
    invoiceNumber: str(raw.invoice_number ?? raw.invoiceNumber),
    status: str(raw.status ?? "draft") as SupplierInvoiceStatus,
    currency: str(raw.currency ?? "SAR"),
    issueDate: str(raw.issue_date ?? raw.issueDate),
    dueDate: str(raw.due_date ?? raw.dueDate),
    notes: str(raw.notes),
    subtotal,
    taxTotal,
    total: Number(raw.total ?? subtotal + taxTotal),
    lines,
    createdAt: str(raw.created_at ?? raw.createdAt),
    updatedAt: str(raw.updated_at ?? raw.updatedAt),
  };
}

function mapIssue(raw: Raw): IssueEvent {
  return {
    id: str(raw.id),
    supplierId: str(raw.supplier_id ?? raw.supplierId),
    note: str(raw.note ?? raw.body),
    createdBy: str(raw.created_by ?? raw.createdBy),
    createdByName: str(raw.created_by_name ?? raw.createdByName),
    createdAt: str(raw.created_at ?? raw.createdAt),
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

export type CreateInvoiceInput = {
  supplierId: string;
  invoiceNumber: string;
  currency?: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  taxTotal?: number;
  lines?: {
    description: string;
    quantity: number;
    unitCost: number;
    linkId?: string;
  }[];
};

export type SetInvoiceLinesInput = {
  lines: {
    description: string;
    quantity: number;
    unitCost: number;
    linkId?: string;
  }[];
  taxTotal?: number;
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
  listInvoices(supplierId: string): Promise<SupplierInvoice[]>;
  getInvoice(id: string): Promise<SupplierInvoice>;
  createInvoice(input: CreateInvoiceInput): Promise<SupplierInvoice>;
  updateInvoiceStatus(
    id: string,
    status: SupplierInvoiceStatus,
  ): Promise<SupplierInvoice>;
  setInvoiceLines(
    id: string,
    input: SetInvoiceLinesInput,
  ): Promise<SupplierInvoice>;
  listIssues(supplierId: string): Promise<IssueEvent[]>;
  createIssue(supplierId: string, input: CreateIssueInput): Promise<IssueEvent>;
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

  async listInvoices(supplierId: string) {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/suppliers/invoices?supplier_id=${encodeURIComponent(supplierId)}`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapInvoice);
  }

  async getInvoice(id: string) {
    return mapInvoice(
      await this.http.request<Raw>(`/suppliers/invoices/${id}`),
    );
  }

  async createInvoice(input: CreateInvoiceInput) {
    return mapInvoice(
      await this.http.request<Raw>("/suppliers/invoices", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: input.supplierId,
          invoice_number: input.invoiceNumber,
          currency: input.currency ?? "SAR",
          issue_date: input.issueDate ?? "",
          due_date: input.dueDate ?? "",
          notes: input.notes ?? "",
          tax_total: input.taxTotal ?? 0,
          lines: (input.lines ?? []).map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unit_cost: l.unitCost,
            link_id: l.linkId,
          })),
        }),
      }),
    );
  }

  async updateInvoiceStatus(id: string, status: SupplierInvoiceStatus) {
    return mapInvoice(
      await this.http.request<Raw>(`/suppliers/invoices/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    );
  }

  async setInvoiceLines(id: string, input: SetInvoiceLinesInput) {
    return mapInvoice(
      await this.http.request<Raw>(`/suppliers/invoices/${id}/lines`, {
        method: "PUT",
        body: JSON.stringify({
          lines: input.lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unit_cost: l.unitCost,
            link_id: l.linkId,
          })),
          tax_total: input.taxTotal,
        }),
      }),
    );
  }

  async listIssues(supplierId: string) {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/suppliers/${supplierId}/issues`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapIssue);
  }

  async createIssue(supplierId: string, input: CreateIssueInput) {
    return mapIssue(
      await this.http.request<Raw>(`/suppliers/${supplierId}/issues`, {
        method: "POST",
        body: JSON.stringify({ note: input.note }),
      }),
    );
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
  private invoices: SupplierInvoice[] = [
    {
      id: "inv-1",
      supplierId: "sup-1",
      branchId: "br-1",
      invoiceNumber: "INV-2026-001",
      status: "received",
      currency: "SAR",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      notes: "",
      subtotal: 170000,
      taxTotal: 25500,
      total: 195500,
      lines: [
        {
          id: "il-1",
          description: "Hotel allotment — Makkah",
          quantity: 2,
          unitCost: 85000,
          linkId: "lnk-1",
          lineTotal: 170000,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  private issues: IssueEvent[] = [
    {
      id: "iss-1",
      supplierId: "sup-1",
      note: "Allotment confirmation delayed for Makkah block",
      createdBy: "u-1",
      createdByName: "Ops",
      createdAt: new Date().toISOString(),
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

  async listInvoices(supplierId: string) {
    return this.invoices
      .filter((i) => i.supplierId === supplierId)
      .map((i) => ({ ...i, lines: i.lines.map((l) => ({ ...l })) }));
  }

  async getInvoice(id: string) {
    const inv = this.invoices.find((x) => x.id === id);
    if (!inv) throw new Error("invoice not found");
    return { ...inv, lines: inv.lines.map((l) => ({ ...l })) };
  }

  async createInvoice(input: CreateInvoiceInput) {
    const now = new Date().toISOString();
    const lines: SupplierInvoiceLine[] = (input.lines ?? []).map((l) => ({
      id: crypto.randomUUID(),
      description: l.description,
      quantity: l.quantity,
      unitCost: l.unitCost,
      linkId: l.linkId ?? null,
      lineTotal: l.quantity * l.unitCost,
    }));
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const taxTotal = input.taxTotal ?? 0;
    const inv: SupplierInvoice = {
      id: crypto.randomUUID(),
      supplierId: input.supplierId,
      branchId: "br-1",
      invoiceNumber: input.invoiceNumber,
      status: "draft",
      currency: input.currency ?? "SAR",
      issueDate: input.issueDate ?? now.slice(0, 10),
      dueDate: input.dueDate ?? "",
      notes: input.notes ?? "",
      subtotal,
      taxTotal,
      total: subtotal + taxTotal,
      lines,
      createdAt: now,
      updatedAt: now,
    };
    this.invoices.unshift(inv);
    return { ...inv, lines: inv.lines.map((l) => ({ ...l })) };
  }

  async updateInvoiceStatus(id: string, status: SupplierInvoiceStatus) {
    const inv = await this.getInvoice(id);
    inv.status = status;
    inv.updatedAt = new Date().toISOString();
    const i = this.invoices.findIndex((x) => x.id === id);
    this.invoices[i] = inv;
    return { ...inv, lines: inv.lines.map((l) => ({ ...l })) };
  }

  async setInvoiceLines(id: string, input: SetInvoiceLinesInput) {
    const inv = await this.getInvoice(id);
    inv.lines = input.lines.map((l) => ({
      id: crypto.randomUUID(),
      description: l.description,
      quantity: l.quantity,
      unitCost: l.unitCost,
      linkId: l.linkId ?? null,
      lineTotal: l.quantity * l.unitCost,
    }));
    inv.subtotal = inv.lines.reduce((s, l) => s + l.lineTotal, 0);
    if (input.taxTotal != null) inv.taxTotal = input.taxTotal;
    inv.total = inv.subtotal + inv.taxTotal;
    inv.updatedAt = new Date().toISOString();
    const i = this.invoices.findIndex((x) => x.id === id);
    this.invoices[i] = inv;
    return { ...inv, lines: inv.lines.map((l) => ({ ...l })) };
  }

  async listIssues(supplierId: string) {
    return this.issues
      .filter((i) => i.supplierId === supplierId)
      .map((i) => ({ ...i }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async createIssue(supplierId: string, input: CreateIssueInput) {
    const issue: IssueEvent = {
      id: crypto.randomUUID(),
      supplierId,
      note: input.note,
      createdBy: "local",
      createdByName: "You",
      createdAt: new Date().toISOString(),
    };
    this.issues.unshift(issue);
    return { ...issue };
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
    listInvoices: wrap(api.listInvoices.bind(api), mem.listInvoices.bind(mem)),
    getInvoice: wrap(api.getInvoice.bind(api), mem.getInvoice.bind(mem)),
    createInvoice: wrap(
      api.createInvoice.bind(api),
      mem.createInvoice.bind(mem),
    ),
    updateInvoiceStatus: wrap(
      api.updateInvoiceStatus.bind(api),
      mem.updateInvoiceStatus.bind(mem),
    ),
    setInvoiceLines: wrap(
      api.setInvoiceLines.bind(api),
      mem.setInvoiceLines.bind(mem),
    ),
    listIssues: wrap(api.listIssues.bind(api), mem.listIssues.bind(mem)),
    createIssue: wrap(api.createIssue.bind(api), mem.createIssue.bind(mem)),
  };
}
