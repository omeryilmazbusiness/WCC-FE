import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import type {
  CreateLostReasonInput,
  CreateTemplateInput,
  CustomFieldDef,
  EscalationInput,
  EscalationRule,
  EventCatalogItem,
  FieldEntity,
  FieldSettings,
  LostReason,
  MessageTemplate,
  NotificationSeverity,
  SlaPolicy,
  ThresholdSettings,
  UpdateLostReasonInput,
  UpdateTemplateInput,
} from "./model";

type Raw = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function rows(data: Raw[] | { items?: Raw[] } | null | undefined): Raw[] {
  if (Array.isArray(data)) return data;
  return data?.items ?? [];
}

function mapSla(raw: Raw): SlaPolicy {
  return {
    channel: str(raw.channel, "*") || "*",
    firstResponseSeconds: Number(raw.first_response_seconds ?? 0),
  };
}

function mapEscalation(raw: Raw): EscalationRule {
  const roles = raw.escalate_to_roles;
  return {
    kind: str(raw.kind),
    severity: str(raw.severity, "info") as NotificationSeverity,
    escalateAfterSeconds: Number(raw.escalate_after_seconds ?? 0),
    escalateToRoles: Array.isArray(roles) ? roles.map(String) : [],
    groupable: Boolean(raw.groupable),
    defaultTitle: str(raw.default_title),
    defaultHref: str(raw.default_href),
    entityType: str(raw.entity_type),
    overridden: Boolean(raw.overridden),
    enabled: raw.enabled !== false,
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
    capacitySoftPct: Number(raw.capacity_soft_pct ?? 80),
    paymentOverdueHours: Number(raw.payment_overdue_hours ?? 12),
    missingDocHours: Number(raw.missing_doc_hours ?? 24),
    leadNoFollowupHours: Number(raw.lead_no_followup_hours ?? 24),
    targetBehindPct: Number(raw.target_behind_pct ?? 15),
    slaWarnPct: Number(raw.sla_warn_pct ?? 75),
    slaBreachPct: Number(raw.sla_breach_pct ?? 100),
    visaFollowUpDays: Number(raw.visa_follow_up_days ?? 7),
  };
}

function mapEvent(raw: Raw): EventCatalogItem {
  return {
    name: str(raw.name),
    description: str(raw.description),
    idempotent: Boolean(raw.idempotent),
    durable: Boolean(raw.durable),
  };
}

export interface AdminConfigRepository {
  getSla(): Promise<SlaPolicy[]>;
  putSla(policies: SlaPolicy[]): Promise<SlaPolicy[]>;
  listEscalation(): Promise<EscalationRule[]>;
  putEscalation(kind: string, input: EscalationInput): Promise<void>;
  /** Drops the branch override so the default rule applies again. */
  resetEscalation(kind: string): Promise<void>;
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
    return rows(await this.http.request<Raw[]>("/settings/sla")).map(mapSla);
  }

  async putSla(policies: SlaPolicy[]) {
    const data = await this.http.request<Raw[]>("/settings/sla", {
      method: "PUT",
      body: JSON.stringify(
        policies.map((p) => ({
          channel: p.channel,
          first_response_seconds: p.firstResponseSeconds,
        })),
      ),
    });
    return rows(data).map(mapSla);
  }

  async listEscalation() {
    return rows(await this.http.request<Raw[]>("/settings/escalation")).map(mapEscalation);
  }

  async putEscalation(kind: string, input: EscalationInput) {
    await this.http.request(`/settings/escalation/${encodeURIComponent(kind)}`, {
      method: "PUT",
      body: JSON.stringify({
        escalate_after_seconds: input.escalateAfterSeconds,
        escalate_to_roles: input.escalateToRoles,
        enabled: input.enabled,
      }),
    });
  }

  async resetEscalation(kind: string) {
    await this.http.request(`/settings/escalation/${encodeURIComponent(kind)}`, {
      method: "DELETE",
    });
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
          capacity_soft_pct: input.capacitySoftPct,
          payment_overdue_hours: input.paymentOverdueHours,
          missing_doc_hours: input.missingDocHours,
          lead_no_followup_hours: input.leadNoFollowupHours,
          target_behind_pct: input.targetBehindPct,
          sla_warn_pct: input.slaWarnPct,
          sla_breach_pct: input.slaBreachPct,
          visa_follow_up_days: input.visaFollowUpDays,
        }),
      }),
    );
  }

  async listEventsCatalog() {
    return rows(await this.http.request<Raw[]>("/events/catalog")).map(mapEvent);
  }
}

class MemoryRepo implements AdminConfigRepository {
  private sla: SlaPolicy[] = [
    { channel: "*", firstResponseSeconds: 900 },
    { channel: "whatsapp", firstResponseSeconds: 900 },
  ];
  private escalation: EscalationRule[] = [
    {
      kind: "message.sla_breached",
      severity: "critical",
      escalateAfterSeconds: 900,
      escalateToRoles: ["manager", "gm"],
      groupable: true,
      defaultTitle: "Conversation SLA breached",
      defaultHref: "/inbox",
      entityType: "conversation",
      overridden: false,
      enabled: true,
    },
    {
      kind: "task.overdue",
      severity: "warning",
      escalateAfterSeconds: 7200,
      escalateToRoles: ["manager"],
      groupable: true,
      defaultTitle: "Task overdue",
      defaultHref: "/tasks",
      entityType: "task",
      overridden: false,
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
    capacitySoftPct: 80,
    paymentOverdueHours: 12,
    missingDocHours: 24,
    leadNoFollowupHours: 24,
    targetBehindPct: 15,
    slaWarnPct: 75,
    slaBreachPct: 100,
    visaFollowUpDays: 7,
  };
  private events: EventCatalogItem[] = [
    { name: "task.overdue", description: "Task became overdue", idempotent: true, durable: true },
    { name: "lead.created", description: "Lead created", idempotent: true, durable: false },
  ];

  async getSla() {
    return this.sla.map((p) => ({ ...p }));
  }
  async putSla(policies: SlaPolicy[]) {
    this.sla = policies.map((p) => ({ ...p }));
    return this.getSla();
  }
  async listEscalation() {
    return this.escalation.map((e) => ({ ...e, escalateToRoles: [...e.escalateToRoles] }));
  }
  async putEscalation(kind: string, input: EscalationInput) {
    const rule = this.escalation.find((e) => e.kind === kind);
    if (!rule) throw new Error("unknown escalation kind");
    Object.assign(rule, { ...input, escalateToRoles: [...input.escalateToRoles], overridden: true });
  }
  async resetEscalation(kind: string) {
    const rule = this.escalation.find((e) => e.kind === kind);
    if (rule) Object.assign(rule, { overridden: false, enabled: true });
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
  const api = new ApiRepo(http);
  if (!mem) mem = new MemoryRepo();
  return createRepository<AdminConfigRepository>({
    api,
    memory: mem,
    reads: [
      "getSla",
      "listEscalation",
      "listLostReasons",
      "listTemplates",
      "getTemplate",
      "getFields",
      "getThresholds",
      "listEventsCatalog",
    ],
  });
}
