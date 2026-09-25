import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  CreateLostReasonInput,
  CreateTemplateInput,
  CustomFieldDef,
  EscalationKind,
  EscalationRule,
  EventCatalogItem,
  FieldEntity,
  FieldSettings,
  LostReason,
  MessageTemplate,
  SlaSettings,
  ThresholdSettings,
  UpdateLostReasonInput,
  UpdateTemplateInput,
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

function mapSla(raw: Raw): SlaSettings {
  return {
    firstResponseMinutes: Number(
      raw.first_response_minutes ?? raw.firstResponseMinutes ?? 60,
    ),
    resolveMinutes: Number(raw.resolve_minutes ?? raw.resolveMinutes ?? 1440),
    businessHoursOnly: Boolean(
      raw.business_hours_only ?? raw.businessHoursOnly ?? true,
    ),
  };
}

function mapEscalation(raw: Raw): EscalationRule {
  const roles = raw.notify_roles ?? raw.notifyRoles;
  return {
    kind: str(raw.kind, "sla_breach") as EscalationKind,
    afterMinutes: Number(raw.after_minutes ?? raw.afterMinutes ?? 30),
    notifyRoles: Array.isArray(roles) ? roles.map(String) : [],
    escalateToRole: str(raw.escalate_to_role ?? raw.escalateToRole, "manager"),
    enabled: Boolean(raw.enabled ?? true),
  };
}

function mapLostReason(raw: Raw): LostReason {
  return {
    id: str(raw.id),
    code: str(raw.code),
    labelEn: str(raw.label_en ?? raw.labelEn),
    labelAr: str(raw.label_ar ?? raw.labelAr),
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
    sortOrder: Number(raw.sort_order ?? raw.sortOrder ?? 0),
  };
}

function mapTemplate(raw: Raw): MessageTemplate {
  return {
    id: str(raw.id),
    code: str(raw.code),
    channel: str(raw.channel ?? "whatsapp"),
    subject: str(raw.subject),
    bodyEn: str(raw.body_en ?? raw.bodyEn),
    bodyAr: str(raw.body_ar ?? raw.bodyAr),
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
    updatedAt: str(raw.updated_at ?? raw.updatedAt),
  };
}

function mapField(raw: Raw): CustomFieldDef {
  const options = raw.options;
  return {
    key: str(raw.key),
    labelEn: str(raw.label_en ?? raw.labelEn),
    labelAr: str(raw.label_ar ?? raw.labelAr),
    fieldType: str(raw.field_type ?? raw.fieldType ?? "text"),
    required: Boolean(raw.required ?? false),
    options: Array.isArray(options) ? options.map(String) : [],
    sortOrder: Number(raw.sort_order ?? raw.sortOrder ?? 0),
  };
}

function mapFields(raw: Raw, entity: FieldEntity): FieldSettings {
  const fieldsRaw = Array.isArray(raw.fields)
    ? (raw.fields as Raw[])
    : Array.isArray(raw)
      ? (raw as Raw[])
      : [];
  return {
    entity: str(raw.entity ?? entity, entity) as FieldEntity,
    fields: fieldsRaw.map(mapField),
  };
}

function mapThresholds(raw: Raw): ThresholdSettings {
  return {
    softCapacityPct: Number(
      raw.soft_capacity_pct ?? raw.softCapacityPct ?? 80,
    ),
    hardCapacityPct: Number(
      raw.hard_capacity_pct ?? raw.hardCapacityPct ?? 100,
    ),
    overdueTaskHours: Number(
      raw.overdue_task_hours ?? raw.overdueTaskHours ?? 24,
    ),
    unpaidBookingDays: Number(
      raw.unpaid_booking_days ?? raw.unpaidBookingDays ?? 3,
    ),
    marginAlertPct: Number(raw.margin_alert_pct ?? raw.marginAlertPct ?? 15),
  };
}

function mapEvent(raw: Raw): EventCatalogItem {
  return {
    code: str(raw.code ?? raw.id),
    category: str(raw.category ?? "ops"),
    description: str(raw.description ?? raw.name),
    severity: str(raw.severity ?? "info"),
  };
}

export interface AdminConfigRepository {
  getSla(): Promise<SlaSettings>;
  putSla(input: SlaSettings): Promise<SlaSettings>;
  listEscalation(): Promise<EscalationRule[]>;
  putEscalation(kind: string, input: EscalationRule): Promise<EscalationRule>;
  deleteEscalation(kind: string): Promise<void>;
  listLostReasons(): Promise<LostReason[]>;
  createLostReason(input: CreateLostReasonInput): Promise<LostReason>;
  updateLostReason(id: string, input: UpdateLostReasonInput): Promise<LostReason>;
  deleteLostReason(id: string): Promise<void>;
  listTemplates(): Promise<MessageTemplate[]>;
  createTemplate(input: CreateTemplateInput): Promise<MessageTemplate>;
  getTemplate(id: string): Promise<MessageTemplate>;
  updateTemplate(id: string, input: UpdateTemplateInput): Promise<MessageTemplate>;
  deleteTemplate(id: string): Promise<void>;
  getFields(entity: FieldEntity): Promise<FieldSettings>;
  putFields(entity: FieldEntity, fields: CustomFieldDef[]): Promise<FieldSettings>;
  getThresholds(): Promise<ThresholdSettings>;
  putThresholds(input: ThresholdSettings): Promise<ThresholdSettings>;
  listEventsCatalog(): Promise<EventCatalogItem[]>;
}

class ApiRepo implements AdminConfigRepository {
  constructor(private readonly http: HttpClient) {}

  async getSla() {
    return mapSla(await this.http.request<Raw>("/settings/sla"));
  }

  async putSla(input: SlaSettings) {
    return mapSla(
      await this.http.request<Raw>("/settings/sla", {
        method: "PUT",
        body: JSON.stringify({
          first_response_minutes: input.firstResponseMinutes,
          resolve_minutes: input.resolveMinutes,
          business_hours_only: input.businessHoursOnly,
        }),
      }),
    );
  }

  async listEscalation() {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      "/settings/escalation",
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapEscalation);
  }

  async putEscalation(kind: string, input: EscalationRule) {
    return mapEscalation(
      await this.http.request<Raw>(
        `/settings/escalation/${encodeURIComponent(kind)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            kind: input.kind,
            after_minutes: input.afterMinutes,
            notify_roles: input.notifyRoles,
            escalate_to_role: input.escalateToRole,
            enabled: input.enabled,
          }),
        },
      ),
    );
  }

  async deleteEscalation(kind: string) {
    await this.http.request(
      `/settings/escalation/${encodeURIComponent(kind)}`,
      { method: "DELETE" },
    );
  }

  async listLostReasons() {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      "/settings/lost-reasons",
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapLostReason);
  }

  async createLostReason(input: CreateLostReasonInput) {
    return mapLostReason(
      await this.http.request<Raw>("/settings/lost-reasons", {
        method: "POST",
        body: JSON.stringify({
          code: input.code,
          label_en: input.labelEn ?? "",
          label_ar: input.labelAr ?? "",
          sort_order: input.sortOrder ?? 0,
        }),
      }),
    );
  }

  async updateLostReason(id: string, input: UpdateLostReasonInput) {
    return mapLostReason(
      await this.http.request<Raw>(`/settings/lost-reasons/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          code: input.code,
          label_en: input.labelEn,
          label_ar: input.labelAr,
          is_active: input.isActive,
          sort_order: input.sortOrder,
        }),
      }),
    );
  }

  async deleteLostReason(id: string) {
    await this.http.request(`/settings/lost-reasons/${id}`, {
      method: "DELETE",
    });
  }

  async listTemplates() {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      "/settings/templates",
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapTemplate);
  }

  async createTemplate(input: CreateTemplateInput) {
    return mapTemplate(
      await this.http.request<Raw>("/settings/templates", {
        method: "POST",
        body: JSON.stringify({
          code: input.code,
          channel: input.channel ?? "whatsapp",
          subject: input.subject ?? "",
          body_en: input.bodyEn ?? "",
          body_ar: input.bodyAr ?? "",
        }),
      }),
    );
  }

  async getTemplate(id: string) {
    return mapTemplate(
      await this.http.request<Raw>(`/settings/templates/${id}`),
    );
  }

  async updateTemplate(id: string, input: UpdateTemplateInput) {
    return mapTemplate(
      await this.http.request<Raw>(`/settings/templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          code: input.code,
          channel: input.channel,
          subject: input.subject,
          body_en: input.bodyEn,
          body_ar: input.bodyAr,
          is_active: input.isActive,
        }),
      }),
    );
  }

  async deleteTemplate(id: string) {
    await this.http.request(`/settings/templates/${id}`, { method: "DELETE" });
  }

  async getFields(entity: FieldEntity) {
    return mapFields(
      await this.http.request<Raw>(
        `/settings/fields?entity=${encodeURIComponent(entity)}`,
      ),
      entity,
    );
  }

  async putFields(entity: FieldEntity, fields: CustomFieldDef[]) {
    return mapFields(
      await this.http.request<Raw>(
        `/settings/fields?entity=${encodeURIComponent(entity)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            entity,
            fields: fields.map((f) => ({
              key: f.key,
              label_en: f.labelEn,
              label_ar: f.labelAr,
              field_type: f.fieldType,
              required: f.required,
              options: f.options,
              sort_order: f.sortOrder,
            })),
          }),
        },
      ),
      entity,
    );
  }

  async getThresholds() {
    return mapThresholds(await this.http.request<Raw>("/settings/thresholds"));
  }

  async putThresholds(input: ThresholdSettings) {
    return mapThresholds(
      await this.http.request<Raw>("/settings/thresholds", {
        method: "PUT",
        body: JSON.stringify({
          soft_capacity_pct: input.softCapacityPct,
          hard_capacity_pct: input.hardCapacityPct,
          overdue_task_hours: input.overdueTaskHours,
          unpaid_booking_days: input.unpaidBookingDays,
          margin_alert_pct: input.marginAlertPct,
        }),
      }),
    );
  }

  async listEventsCatalog() {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      "/events/catalog",
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapEvent);
  }
}

class MemoryRepo implements AdminConfigRepository {
  private sla: SlaSettings = {
    firstResponseMinutes: 60,
    resolveMinutes: 1440,
    businessHoursOnly: true,
  };
  private escalation: EscalationRule[] = [
    {
      kind: "sla_breach",
      afterMinutes: 30,
      notifyRoles: ["manager"],
      escalateToRole: "gm",
      enabled: true,
    },
  ];
  private lostReasons: LostReason[] = [
    {
      id: "lr-1",
      code: "price",
      labelEn: "Price",
      labelAr: "السعر",
      isActive: true,
      sortOrder: 1,
    },
    {
      id: "lr-2",
      code: "timing",
      labelEn: "Timing",
      labelAr: "التوقيت",
      isActive: true,
      sortOrder: 2,
    },
  ];
  private templates: MessageTemplate[] = [
    {
      id: "tpl-1",
      code: "welcome",
      channel: "whatsapp",
      subject: "Welcome",
      bodyEn: "Thanks for reaching out — how can we help?",
      bodyAr: "شكرًا لتواصلك — كيف نقدر نساعدك؟",
      isActive: true,
      updatedAt: new Date().toISOString(),
    },
  ];
  private fieldsByEntity: Record<string, CustomFieldDef[]> = {
    lead: [
      {
        key: "source_detail",
        labelEn: "Source detail",
        labelAr: "تفاصيل المصدر",
        fieldType: "text",
        required: false,
        options: [],
        sortOrder: 1,
      },
    ],
  };
  private thresholds: ThresholdSettings = {
    softCapacityPct: 80,
    hardCapacityPct: 100,
    overdueTaskHours: 24,
    unpaidBookingDays: 3,
    marginAlertPct: 15,
  };
  private events: EventCatalogItem[] = [
    {
      code: "sla.breached",
      category: "inbox",
      description: "Conversation SLA breached",
      severity: "high",
    },
    {
      code: "booking.unpaid",
      category: "finance",
      description: "Booking unpaid past threshold",
      severity: "medium",
    },
  ];

  async getSla() {
    return { ...this.sla };
  }
  async putSla(input: SlaSettings) {
    this.sla = { ...input };
    return { ...this.sla };
  }
  async listEscalation() {
    return this.escalation.map((e) => ({ ...e, notifyRoles: [...e.notifyRoles] }));
  }
  async putEscalation(kind: string, input: EscalationRule) {
    const i = this.escalation.findIndex((e) => e.kind === kind);
    const next = { ...input, kind: kind as EscalationKind };
    if (i >= 0) this.escalation[i] = next;
    else this.escalation.push(next);
    return { ...next, notifyRoles: [...next.notifyRoles] };
  }
  async deleteEscalation(kind: string) {
    this.escalation = this.escalation.filter((e) => e.kind !== kind);
  }
  async listLostReasons() {
    return this.lostReasons.map((r) => ({ ...r }));
  }
  async createLostReason(input: CreateLostReasonInput) {
    const r: LostReason = {
      id: crypto.randomUUID(),
      code: input.code,
      labelEn: input.labelEn ?? "",
      labelAr: input.labelAr ?? "",
      isActive: true,
      sortOrder: input.sortOrder ?? this.lostReasons.length + 1,
    };
    this.lostReasons.push(r);
    return { ...r };
  }
  async updateLostReason(id: string, input: UpdateLostReasonInput) {
    const r = this.lostReasons.find((x) => x.id === id);
    if (!r) throw new Error("lost reason not found");
    Object.assign(r, {
      ...(input.code != null ? { code: input.code } : {}),
      ...(input.labelEn != null ? { labelEn: input.labelEn } : {}),
      ...(input.labelAr != null ? { labelAr: input.labelAr } : {}),
      ...(input.isActive != null ? { isActive: input.isActive } : {}),
      ...(input.sortOrder != null ? { sortOrder: input.sortOrder } : {}),
    });
    return { ...r };
  }
  async deleteLostReason(id: string) {
    this.lostReasons = this.lostReasons.filter((r) => r.id !== id);
  }
  async listTemplates() {
    return this.templates.map((t) => ({ ...t }));
  }
  async createTemplate(input: CreateTemplateInput) {
    const t: MessageTemplate = {
      id: crypto.randomUUID(),
      code: input.code,
      channel: input.channel ?? "whatsapp",
      subject: input.subject ?? "",
      bodyEn: input.bodyEn ?? "",
      bodyAr: input.bodyAr ?? "",
      isActive: true,
      updatedAt: new Date().toISOString(),
    };
    this.templates.unshift(t);
    return { ...t };
  }
  async getTemplate(id: string) {
    const t = this.templates.find((x) => x.id === id);
    if (!t) throw new Error("template not found");
    return { ...t };
  }
  async updateTemplate(id: string, input: UpdateTemplateInput) {
    const t = await this.getTemplate(id);
    Object.assign(t, input, { updatedAt: new Date().toISOString() });
    const i = this.templates.findIndex((x) => x.id === id);
    this.templates[i] = t;
    return { ...t };
  }
  async deleteTemplate(id: string) {
    this.templates = this.templates.filter((t) => t.id !== id);
  }
  async getFields(entity: FieldEntity) {
    return {
      entity,
      fields: (this.fieldsByEntity[entity] ?? []).map((f) => ({
        ...f,
        options: [...f.options],
      })),
    };
  }
  async putFields(entity: FieldEntity, fields: CustomFieldDef[]) {
    this.fieldsByEntity[entity] = fields.map((f) => ({
      ...f,
      options: [...f.options],
    }));
    return this.getFields(entity);
  }
  async getThresholds() {
    return { ...this.thresholds };
  }
  async putThresholds(input: ThresholdSettings) {
    this.thresholds = { ...input };
    return { ...this.thresholds };
  }
  async listEventsCatalog() {
    return this.events.map((e) => ({ ...e }));
  }
}

let mem: MemoryRepo | null = null;

export function createAdminConfigRepository(): AdminConfigRepository {
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
    getSla: wrap(api.getSla.bind(api), mem.getSla.bind(mem)),
    putSla: wrap(api.putSla.bind(api), mem.putSla.bind(mem)),
    listEscalation: wrap(
      api.listEscalation.bind(api),
      mem.listEscalation.bind(mem),
    ),
    putEscalation: wrap(
      api.putEscalation.bind(api),
      mem.putEscalation.bind(mem),
    ),
    deleteEscalation: wrap(
      api.deleteEscalation.bind(api),
      mem.deleteEscalation.bind(mem),
    ),
    listLostReasons: wrap(
      api.listLostReasons.bind(api),
      mem.listLostReasons.bind(mem),
    ),
    createLostReason: wrap(
      api.createLostReason.bind(api),
      mem.createLostReason.bind(mem),
    ),
    updateLostReason: wrap(
      api.updateLostReason.bind(api),
      mem.updateLostReason.bind(mem),
    ),
    deleteLostReason: wrap(
      api.deleteLostReason.bind(api),
      mem.deleteLostReason.bind(mem),
    ),
    listTemplates: wrap(
      api.listTemplates.bind(api),
      mem.listTemplates.bind(mem),
    ),
    createTemplate: wrap(
      api.createTemplate.bind(api),
      mem.createTemplate.bind(mem),
    ),
    getTemplate: wrap(api.getTemplate.bind(api), mem.getTemplate.bind(mem)),
    updateTemplate: wrap(
      api.updateTemplate.bind(api),
      mem.updateTemplate.bind(mem),
    ),
    deleteTemplate: wrap(
      api.deleteTemplate.bind(api),
      mem.deleteTemplate.bind(mem),
    ),
    getFields: wrap(api.getFields.bind(api), mem.getFields.bind(mem)),
    putFields: wrap(api.putFields.bind(api), mem.putFields.bind(mem)),
    getThresholds: wrap(
      api.getThresholds.bind(api),
      mem.getThresholds.bind(mem),
    ),
    putThresholds: wrap(
      api.putThresholds.bind(api),
      mem.putThresholds.bind(mem),
    ),
    listEventsCatalog: wrap(
      api.listEventsCatalog.bind(api),
      mem.listEventsCatalog.bind(mem),
    ),
  };
}
