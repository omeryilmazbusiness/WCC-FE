import {
  canTransitionLead,
  type ChangeStageInput,
  type Lead,
  type LeadCreateInput,
  type LeadStage,
} from "./model";

export interface LeadRepository {
  list(): Promise<Lead[]>;
  listByCustomerId(customerId: string): Promise<Lead[]>;
  getById(id: string): Promise<Lead>;
  create(input: LeadCreateInput): Promise<Lead>;
  changeStage(id: string, input: ChangeStageInput): Promise<Lead>;
  assign(id: string, ownerId: string, ownerName: string): Promise<Lead>;
}

const OWNERS = [
  { id: "22222222-2222-2222-2222-222222222203", name: "Sales Employee" },
  { id: "22222222-2222-2222-2222-222222222202", name: "Branch Manager" },
  { id: "22222222-2222-2222-2222-222222222201", name: "General Manager" },
] as const;

export const LEAD_OWNERS = OWNERS;

function nowIso() {
  return new Date().toISOString();
}

const store: Lead[] = [
  {
    id: "lead-1",
    branchId: "11111111-1111-1111-1111-111111111111",
    customerId: "demo-1",
    fullName: "Ahmed Al-Rashid",
    phone: "+966500000001",
    source: "WhatsApp",
    stage: "qualified",
    ownerId: OWNERS[0].id,
    ownerName: OWNERS[0].name,
    lostReason: "",
    notes: "Interested in Ramadan Umrah",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "lead-2",
    branchId: "11111111-1111-1111-1111-111111111111",
    fullName: "Fatima Hassan",
    phone: "+966500000002",
    source: "Walk-in",
    stage: "new",
    ownerId: OWNERS[0].id,
    ownerName: OWNERS[0].name,
    lostReason: "",
    notes: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "lead-3",
    branchId: "11111111-1111-1111-1111-111111111111",
    fullName: "Omar Khalil",
    phone: "+971500000003",
    source: "Referral",
    stage: "proposal",
    ownerId: OWNERS[1].id,
    ownerName: OWNERS[1].name,
    lostReason: "",
    notes: "Family of 4 — waiting quote",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "lead-4",
    branchId: "11111111-1111-1111-1111-111111111111",
    fullName: "Sara Nasser",
    phone: "+966500000004",
    source: "Instagram",
    stage: "contacted",
    ownerId: OWNERS[0].id,
    ownerName: OWNERS[0].name,
    lostReason: "",
    notes: "Follow up Thursday",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "lead-5",
    branchId: "11111111-1111-1111-1111-111111111111",
    fullName: "Yusuf Demir",
    phone: "+905350000005",
    source: "Email",
    stage: "lost",
    ownerId: OWNERS[1].id,
    ownerName: OWNERS[1].name,
    lostReason: "Price too high",
    notes: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

export class MemoryLeadRepository implements LeadRepository {
  async list(): Promise<Lead[]> {
    return [...store].sort(
      (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
    );
  }

  async listByCustomerId(customerId: string): Promise<Lead[]> {
    return (await this.list()).filter((l) => l.customerId === customerId);
  }

  async getById(id: string): Promise<Lead> {
    const found = store.find((l) => l.id === id);
    if (!found) throw new Error("Lead not found");
    return found;
  }

  async create(input: LeadCreateInput): Promise<Lead> {
    const lead: Lead = {
      id: crypto.randomUUID(),
      branchId: "11111111-1111-1111-1111-111111111111",
      customerId: input.customerId ?? null,
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      source: input.source?.trim() ?? "",
      stage: "new",
      ownerId: input.ownerId,
      ownerName: input.ownerName,
      lostReason: "",
      notes: input.notes?.trim() ?? "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.unshift(lead);
    return lead;
  }

  async changeStage(id: string, input: ChangeStageInput): Promise<Lead> {
    const lead = await this.getById(id);
    const to = input.stage;
    if (!canTransitionLead(lead.stage, to)) {
      throw new Error(`Invalid stage transition: ${lead.stage} → ${to}`);
    }
    if (to === "lost" && !input.lostReason?.trim()) {
      throw new Error("Lost reason is required");
    }
    lead.stage = to;
    lead.lostReason = to === "lost" ? (input.lostReason?.trim() ?? "") : "";
    if (input.note) lead.notes = input.note;
    lead.updatedAt = nowIso();
    return lead;
  }

  async assign(id: string, ownerId: string, ownerName: string): Promise<Lead> {
    const lead = await this.getById(id);
    lead.ownerId = ownerId;
    lead.ownerName = ownerName;
    lead.updatedAt = nowIso();
    return lead;
  }
}

export function groupLeadsByStage(leads: Lead[]): Record<LeadStage, Lead[]> {
  const map = {
    new: [],
    contacted: [],
    qualified: [],
    proposal: [],
    won: [],
    lost: [],
  } as Record<LeadStage, Lead[]>;
  for (const lead of leads) {
    map[lead.stage].push(lead);
  }
  return map;
}
