import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import {
  DEFAULT_CANCELLATION,
  DEFAULT_CHILD_POLICY,
  DEFAULT_MARKUP,
  addDays,
  covers,
  overlappingSeason,
  seasonFrom,
  seasonOn,
} from "./lib/pricing";
import {
  LANDMARKS,
  MEAL_PLANS,
  ROOM_TYPES,
  SEASON_KINDS,
  type Allotment,
  type AllotmentInput,
  type AllotmentStatus,
  type CancellationPolicy,
  type ChildPolicy,
  type ChildRule,
  type Hotel,
  type HotelDetail,
  type HotelInput,
  type HotelListFilter,
  type HotelListItem,
  type HotelSummary,
  type Markup,
  type MealPlan,
  type Quote,
  type QuoteRequest,
  type Rate,
  type RoomType,
  type Season,
  type SeasonInput,
  type SeasonKind,
  type StopSale,
  type StopSaleInput,
} from "./model";

export interface HotelRepository {
  list(filter?: HotelListFilter): Promise<HotelListItem[]>;
  get(id: string): Promise<HotelDetail>;
  create(input: HotelInput): Promise<Hotel>;
  update(id: string, input: HotelInput): Promise<Hotel>;
  saveSeason(hotelId: string, seasonId: string | null, input: SeasonInput): Promise<Season>;
  deleteSeason(hotelId: string, seasonId: string): Promise<void>;
  saveAllotment(hotelId: string, allotmentId: string | null, input: AllotmentInput): Promise<Allotment>;
  adjustAllotment(hotelId: string, allotmentId: string, delta: number): Promise<Allotment>;
  deleteAllotment(hotelId: string, allotmentId: string): Promise<void>;
  createStopSale(hotelId: string, input: StopSaleInput): Promise<StopSale>;
  deleteStopSale(hotelId: string, stopSaleId: string): Promise<void>;
  quote(hotelId: string, req: QuoteRequest): Promise<Quote>;
}

type Raw = Record<string, unknown>;

const obj = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : v == null ? d : String(v));
const num = (v: unknown, d = 0): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const day = (v: unknown): string => str(v).slice(0, 10);
const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
  (allowed as readonly string[]).includes(str(v)) ? (str(v) as T) : d;
const optNum = (v: unknown): number | null => (v == null || v === "" ? null : num(v, NaN)) ?? null;

function mapMarkup(v: unknown): Markup {
  const m = obj(v);
  return { kind: str(m.kind) === "fixed" ? "fixed" : "percent", value: num(m.value) };
}

function mapRule(v: unknown): ChildRule {
  const r = obj(v);
  return { mode: pick(r.mode, ["free", "percent", "fixed"] as const, "free"), value: num(r.value) };
}

function mapChildPolicy(v: unknown): ChildPolicy {
  const p = obj(v);
  if (!Object.keys(p).length) return { ...DEFAULT_CHILD_POLICY };
  return {
    infantMaxAge: num(p.infant_max_age, 2),
    child1MaxAge: num(p.child1_max_age, 6),
    child2MaxAge: num(p.child2_max_age, 12),
    infant: mapRule(p.infant),
    child1: mapRule(p.child1),
    child2WithBed: mapRule(p.child2_with_bed),
    child2NoBed: mapRule(p.child2_no_bed),
    extraBedAdult: num(p.extra_bed_adult),
  };
}

function mapCancellation(v: unknown): CancellationPolicy {
  const c = obj(v);
  if (!Object.keys(c).length) return { ...DEFAULT_CANCELLATION, tiers: [...DEFAULT_CANCELLATION.tiers] };
  return {
    freeDays: num(c.free_days),
    noShowPct: num(c.no_show_pct, 100),
    tiers: list(c.tiers).map((t) => {
      const r = obj(t);
      return {
        minDays: num(r.min_days),
        kind: str(r.kind) === "nights" ? ("nights" as const) : ("percent" as const),
        value: num(r.value),
      };
    }),
  };
}

export function mapHotel(raw: Raw): Hotel {
  const loc = obj(raw.location);
  const c = obj(raw.contact);
  const lat = optNum(loc.latitude);
  const lng = optNum(loc.longitude);
  return {
    id: str(raw.id),
    branchId: str(raw.branch_id),
    name: str(raw.name),
    nameAr: str(raw.name_ar),
    stars: num(raw.stars),
    location: {
      city: str(loc.city),
      country: str(loc.country),
      district: str(loc.district),
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
      landmark: pick(loc.landmark, [...LANDMARKS, ""] as const, ""),
      distanceM: num(loc.distance_m),
    },
    contact: {
      salesName: str(c.sales_name),
      salesPhone: str(c.sales_phone),
      salesEmail: str(c.sales_email),
      reservationsEmail: str(c.reservations_email),
    },
    roomTypes: list(raw.room_types).filter((r): r is RoomType => (ROOM_TYPES as readonly unknown[]).includes(r)),
    mealPlans: list(raw.meal_plans).filter((m): m is MealPlan => (MEAL_PLANS as readonly unknown[]).includes(m)),
    currency: str(raw.currency, "SAR") || "SAR",
    markup: mapMarkup(raw.markup),
    childPolicy: mapChildPolicy(raw.child_policy),
    cancellation: mapCancellation(raw.cancellation),
    notes: str(raw.notes),
    isActive: raw.is_active !== false,
    createdAt: str(raw.created_at),
    updatedAt: str(raw.updated_at),
  };
}

function mapSummary(v: unknown): HotelSummary {
  const s = obj(v);
  return {
    seasonName: str(s.season_name),
    seasonKind: pick(s.season_kind, [...SEASON_KINDS, ""] as const, ""),
    fromNet: num(s.from_net),
    roomsTotal: num(s.rooms_total),
    roomsSold: num(s.rooms_sold),
    nextRelease: s.next_release ? day(s.next_release) : null,
    stopSaleToday: Boolean(s.stop_sale_today),
    contractFiles: num(s.contract_files),
    seasonsCount: num(s.seasons_count),
    allotmentCount: num(s.allotment_count),
  };
}

function mapRate(v: unknown): Rate {
  const r = obj(v);
  return {
    roomType: pick(r.room_type, ROOM_TYPES, "standard"),
    mealPlan: pick(r.meal_plan, MEAL_PLANS, "ro"),
    single: num(r.single),
    double: num(r.double),
    triple: num(r.triple),
    quad: num(r.quad),
  };
}

function mapSeason(raw: Raw): Season {
  return {
    id: str(raw.id),
    hotelId: str(raw.hotel_id),
    name: str(raw.name),
    kind: pick(raw.kind, SEASON_KINDS, "low"),
    startDate: day(raw.start_date),
    endDate: day(raw.end_date),
    markup: raw.markup ? mapMarkup(raw.markup) : null,
    rates: list(raw.rates).map(mapRate),
  };
}

function mapAllotment(raw: Raw): Allotment {
  return {
    id: str(raw.id),
    hotelId: str(raw.hotel_id),
    roomType: pick(raw.room_type, ROOM_TYPES, "standard"),
    kind: str(raw.kind) === "on_request" ? "on_request" : "guaranteed",
    startDate: day(raw.start_date),
    endDate: day(raw.end_date),
    rooms: num(raw.rooms),
    sold: num(raw.sold),
    releaseDays: num(raw.release_days),
    notes: str(raw.notes),
    releaseDate: day(raw.release_date),
    status: pick(raw.status, ["open", "sold_out", "released", "expired"] as const, "open"),
    available: num(raw.available),
  };
}

function mapStopSale(raw: Raw): StopSale {
  return {
    id: str(raw.id),
    hotelId: str(raw.hotel_id),
    startDate: day(raw.start_date),
    endDate: day(raw.end_date),
    roomType: pick(raw.room_type, [...ROOM_TYPES, ""] as const, ""),
    reason: str(raw.reason),
    createdAt: str(raw.created_at),
  };
}

function mapDetail(raw: Raw): HotelDetail {
  return {
    hotel: mapHotel(obj(raw.hotel)),
    seasons: list(raw.seasons).map((s) => mapSeason(obj(s))),
    allotments: list(raw.allotments).map((a) => mapAllotment(obj(a))),
    stopSales: list(raw.stop_sales).map((s) => mapStopSale(obj(s))),
    today: day(raw.today),
  };
}

function mapQuote(raw: Raw): Quote {
  const c = obj(raw.cancellation);
  return {
    currency: str(raw.currency),
    checkIn: day(raw.check_in),
    checkOut: day(raw.check_out),
    nights: num(raw.nights),
    rooms: num(raw.rooms, 1),
    adults: num(raw.adults),
    guests: num(raw.guests),
    roomType: pick(raw.room_type, ROOM_TYPES, "standard"),
    mealPlan: pick(raw.meal_plan, MEAL_PLANS, "ro"),
    netTotal: num(raw.net_total),
    grossTotal: num(raw.gross_total),
    profit: num(raw.profit),
    bookable: Boolean(raw.bookable),
    availability: pick(raw.availability, ["instant", "on_request", "stop_sale", "unavailable"] as const, "unavailable"),
    allotmentLeft: num(raw.allotment_left),
    missingDates: list(raw.missing_dates).map(day),
    stopSaleDates: list(raw.stop_sale_dates).map(day),
    children: list(raw.children).map((v) => {
      const ch = obj(v);
      return {
        age: num(ch.age),
        band: pick(ch.band, ["infant", "child1", "child2", "adult"] as const, "adult"),
        bed: Boolean(ch.bed),
        net: num(ch.net),
      };
    }),
    nightsDetail: list(raw.nights_detail).map((v) => {
      const n = obj(v);
      return {
        date: day(n.date),
        seasonName: str(n.season_name),
        seasonKind: pick(n.season_kind, [...SEASON_KINDS, ""] as const, ""),
        net: num(n.net),
        gross: num(n.gross),
        priced: Boolean(n.priced),
        stopSale: Boolean(n.stop_sale),
      };
    }),
    cancellation: {
      freeUntil: day(c.free_until),
      freeNow: Boolean(c.free_now),
      penaltyToday: num(c.penalty_today),
      noShow: num(c.no_show),
      tiers: list(c.tiers).map((v) => {
        const t = obj(v);
        return {
          minDays: num(t.min_days),
          kind: str(t.kind) === "nights" ? ("nights" as const) : ("percent" as const),
          value: num(t.value),
          amount: num(t.amount),
          from: day(t.from),
        };
      }),
    },
  };
}

const markupPayload = (m: Markup) => ({ kind: m.kind, value: Math.round(m.value) });
const rulePayload = (r: ChildRule) => ({ mode: r.mode, value: r.mode === "free" ? 0 : Math.round(r.value) });

export function hotelPayload(input: HotelInput): Raw {
  const { location: l, contact: c, childPolicy: p, cancellation: k } = input;
  return {
    name: input.name.trim(),
    name_ar: input.nameAr.trim(),
    stars: input.stars,
    location: {
      city: l.city.trim(),
      country: l.country.trim().toUpperCase(),
      district: l.district.trim(),
      latitude: l.latitude,
      longitude: l.longitude,
      landmark: l.landmark,
      distance_m: Math.max(0, Math.round(l.distanceM)),
    },
    contact: {
      sales_name: c.salesName.trim(),
      sales_phone: c.salesPhone.trim(),
      sales_email: c.salesEmail.trim(),
      reservations_email: c.reservationsEmail.trim(),
    },
    room_types: input.roomTypes,
    meal_plans: input.mealPlans,
    currency: input.currency,
    markup: markupPayload(input.markup),
    child_policy: p
      ? {
          infant_max_age: p.infantMaxAge,
          child1_max_age: p.child1MaxAge,
          child2_max_age: p.child2MaxAge,
          infant: rulePayload(p.infant),
          child1: rulePayload(p.child1),
          child2_with_bed: rulePayload(p.child2WithBed),
          child2_no_bed: rulePayload(p.child2NoBed),
          extra_bed_adult: Math.round(p.extraBedAdult),
        }
      : undefined,
    cancellation: k
      ? {
          free_days: k.freeDays,
          no_show_pct: k.noShowPct,
          tiers: k.tiers.map((t) => ({ min_days: t.minDays, kind: t.kind, value: t.value })),
        }
      : undefined,
    notes: input.notes.trim(),
    is_active: input.isActive,
  };
}

function seasonPayload(input: SeasonInput): Raw {
  return {
    name: input.name.trim(),
    kind: input.kind,
    start_date: input.startDate,
    end_date: input.endDate,
    markup: input.markup ? markupPayload(input.markup) : null,
    rates: input.rates.map((r) => ({
      room_type: r.roomType,
      meal_plan: r.mealPlan,
      single: r.single,
      double: r.double,
      triple: r.triple,
      quad: r.quad,
    })),
  };
}

function allotmentPayload(input: AllotmentInput): Raw {
  return {
    room_type: input.roomType,
    kind: input.kind,
    start_date: input.startDate,
    end_date: input.endDate,
    rooms: input.rooms,
    release_days: input.kind === "on_request" ? 0 : input.releaseDays,
    notes: input.notes.trim(),
  };
}

export class ApiHotelRepository implements HotelRepository {
  constructor(private readonly client: HttpClient = http) {}

  private base(id?: string) {
    return id ? `/hotels/${encodeURIComponent(id)}` : "/hotels";
  }

  async list(filter: HotelListFilter = {}) {
    const qs = new URLSearchParams();
    if (filter.query?.trim()) qs.set("q", filter.query.trim());
    if (filter.city?.trim()) qs.set("city", filter.city.trim());
    if (filter.activeOnly) qs.set("active", "true");
    const q = qs.toString();
    const rows = await this.client.request<Raw[]>(`${this.base()}${q ? `?${q}` : ""}`);
    return list(rows).map((r) => ({ ...mapHotel(obj(r)), summary: mapSummary(obj(r).summary) }));
  }

  async get(id: string) {
    return mapDetail(await this.client.request<Raw>(this.base(id)));
  }

  async create(input: HotelInput) {
    return mapHotel(await this.client.request<Raw>(this.base(), { method: "POST", body: JSON.stringify(hotelPayload(input)) }));
  }

  async update(id: string, input: HotelInput) {
    return mapHotel(await this.client.request<Raw>(this.base(id), { method: "PUT", body: JSON.stringify(hotelPayload(input)) }));
  }

  async saveSeason(hotelId: string, seasonId: string | null, input: SeasonInput) {
    const path = `${this.base(hotelId)}/seasons${seasonId ? `/${encodeURIComponent(seasonId)}` : ""}`;
    const raw = await this.client.request<Raw>(path, {
      method: seasonId ? "PUT" : "POST",
      body: JSON.stringify(seasonPayload(input)),
    });
    return mapSeason(raw);
  }

  async deleteSeason(hotelId: string, seasonId: string) {
    await this.client.request(`${this.base(hotelId)}/seasons/${encodeURIComponent(seasonId)}`, { method: "DELETE" });
  }

  async saveAllotment(hotelId: string, allotmentId: string | null, input: AllotmentInput) {
    const path = `${this.base(hotelId)}/allotments${allotmentId ? `/${encodeURIComponent(allotmentId)}` : ""}`;
    const raw = await this.client.request<Raw>(path, {
      method: allotmentId ? "PUT" : "POST",
      body: JSON.stringify(allotmentPayload(input)),
    });
    return mapAllotment(raw);
  }

  async adjustAllotment(hotelId: string, allotmentId: string, delta: number) {
    const raw = await this.client.request<Raw>(
      `${this.base(hotelId)}/allotments/${encodeURIComponent(allotmentId)}/adjust`,
      { method: "POST", body: JSON.stringify({ delta }) },
    );
    return mapAllotment(raw);
  }

  async deleteAllotment(hotelId: string, allotmentId: string) {
    await this.client.request(`${this.base(hotelId)}/allotments/${encodeURIComponent(allotmentId)}`, { method: "DELETE" });
  }

  async createStopSale(hotelId: string, input: StopSaleInput) {
    const raw = await this.client.request<Raw>(`${this.base(hotelId)}/stop-sales`, {
      method: "POST",
      body: JSON.stringify({
        start_date: input.startDate,
        end_date: input.endDate,
        room_type: input.roomType,
        reason: input.reason.trim(),
      }),
    });
    return mapStopSale(raw);
  }

  async deleteStopSale(hotelId: string, stopSaleId: string) {
    await this.client.request(`${this.base(hotelId)}/stop-sales/${encodeURIComponent(stopSaleId)}`, { method: "DELETE" });
  }

  async quote(hotelId: string, req: QuoteRequest) {
    const raw = await this.client.request<Raw>(`${this.base(hotelId)}/quote`, {
      method: "POST",
      body: JSON.stringify({
        check_in: req.checkIn,
        check_out: req.checkOut,
        room_type: req.roomType,
        meal_plan: req.mealPlan,
        rooms: req.rooms,
        adults: req.adults,
        children: req.children.map((c) => ({ age: c.age, bed: c.bed })),
        extra_bed: req.extraBed,
      }),
    });
    return mapQuote(raw);
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function allotmentStatus(a: Omit<Allotment, "status" | "available" | "releaseDate">, today: string): AllotmentStatus {
  if (a.endDate < today) return "expired";
  if (a.sold >= a.rooms) return "sold_out";
  if (a.kind === "guaranteed" && today >= addDays(a.startDate, -a.releaseDays)) return "released";
  return "open";
}

function withAllotmentState(a: Omit<Allotment, "status" | "available" | "releaseDate">, today: string): Allotment {
  const status = allotmentStatus(a, today);
  return {
    ...a,
    releaseDate: addDays(a.startDate, -a.releaseDays),
    status,
    available: status === "open" ? Math.max(0, a.rooms - a.sold) : 0,
  };
}

let memorySeq = 0;
const memoryId = () => `mem-hotel-${++memorySeq}`;

/** Offline twin with two sample contracts; only reads are served from it in demo mode. */
export class MemoryHotelRepository implements HotelRepository {
  private hotels: Hotel[] = [];
  private seasons: Season[] = [];
  private allotments: Omit<Allotment, "status" | "available" | "releaseDate">[] = [];
  private stops: StopSale[] = [];

  constructor() {
    const today = todayIso();
    const now = new Date().toISOString();
    const makkah: Hotel = {
      id: "mem-hotel-makkah",
      branchId: "",
      name: "Swissôtel Makkah",
      nameAr: "سويس أوتيل مكة",
      stars: 5,
      location: {
        city: "Makkah",
        country: "SA",
        district: "Abraj Al Bait",
        latitude: 21.4189,
        longitude: 39.8262,
        landmark: "haram",
        distanceM: 150,
      },
      contact: {
        salesName: "Ahmed Al-Harbi",
        salesPhone: "+966 12 571 7777",
        salesEmail: "sales@example.com",
        reservationsEmail: "reservations@example.com",
      },
      roomTypes: ["standard", "deluxe", "triple", "quad"],
      mealPlans: ["ro", "bb"],
      currency: "SAR",
      markup: { ...DEFAULT_MARKUP },
      childPolicy: { ...DEFAULT_CHILD_POLICY },
      cancellation: { ...DEFAULT_CANCELLATION },
      notes: "",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    const madinah: Hotel = {
      ...makkah,
      id: "mem-hotel-madinah",
      name: "Anwar Al Madinah Mövenpick",
      nameAr: "أنوار المدينة موفنبيك",
      location: { ...makkah.location, city: "Madinah", district: "Central Area", latitude: 24.4686, longitude: 39.6106, landmark: "nabawi", distanceM: 80 },
      mealPlans: ["bb", "hb"],
    };
    this.hotels = [makkah, madinah];
    const rate = (roomType: RoomType, mealPlan: MealPlan, d: number): Rate => ({
      roomType,
      mealPlan,
      single: d * 2,
      double: d,
      triple: Math.round(d * 0.8),
      quad: Math.round(d * 0.7),
    });
    this.seasons = [
      {
        id: memoryId(),
        hotelId: makkah.id,
        name: "Low season",
        kind: "low",
        startDate: addDays(today, -30),
        endDate: addDays(today, 60),
        markup: null,
        rates: [rate("standard", "bb", 45000), rate("deluxe", "bb", 60000)],
      },
      {
        id: memoryId(),
        hotelId: makkah.id,
        name: "Ramadan peak",
        kind: "peak",
        startDate: addDays(today, 61),
        endDate: addDays(today, 90),
        markup: { kind: "percent", value: 2000 },
        rates: [rate("standard", "bb", 120000), rate("deluxe", "bb", 150000)],
      },
      {
        id: memoryId(),
        hotelId: madinah.id,
        name: "All year",
        kind: "high",
        startDate: addDays(today, -10),
        endDate: addDays(today, 200),
        markup: null,
        rates: [rate("standard", "bb", 38000), rate("quad", "hb", 30000)],
      },
    ];
    this.allotments = [
      { id: memoryId(), hotelId: makkah.id, roomType: "standard", kind: "guaranteed", startDate: addDays(today, 10), endDate: addDays(today, 40), rooms: 20, sold: 12, releaseDays: 7, notes: "" },
      { id: memoryId(), hotelId: madinah.id, roomType: "quad", kind: "on_request", startDate: addDays(today, 5), endDate: addDays(today, 50), rooms: 10, sold: 2, releaseDays: 0, notes: "" },
    ];
  }

  private hotel(id: string): Hotel {
    const h = this.hotels.find((x) => x.id === id);
    if (!h) throw new Error("hotel not found");
    return h;
  }

  async list(filter: HotelListFilter = {}) {
    const today = todayIso();
    const q = filter.query?.trim().toLowerCase() ?? "";
    return this.hotels
      .filter((h) => (!filter.activeOnly || h.isActive) && (!filter.city || h.location.city === filter.city))
      .filter((h) => !q || `${h.name} ${h.nameAr} ${h.location.city} ${h.location.district}`.toLowerCase().includes(q))
      .map((h) => {
        const seasons = this.seasons.filter((s) => s.hotelId === h.id);
        const current = seasonOn(seasons, today);
        const blocks = this.allotments.filter((a) => a.hotelId === h.id && a.endDate >= today);
        const releases = blocks.filter((a) => a.kind === "guaranteed").map((a) => addDays(a.startDate, -a.releaseDays)).filter((d) => d >= today).sort();
        return {
          ...h,
          summary: {
            seasonName: current?.name ?? "",
            seasonKind: (current?.kind ?? "") as SeasonKind | "",
            fromNet: current ? seasonFrom(current) : 0,
            roomsTotal: blocks.reduce((s, a) => s + a.rooms, 0),
            roomsSold: blocks.reduce((s, a) => s + a.sold, 0),
            nextRelease: releases[0] ?? null,
            stopSaleToday: this.stops.some((s) => s.hotelId === h.id && covers(s.startDate, s.endDate, today)),
            contractFiles: 0,
            seasonsCount: seasons.length,
            allotmentCount: blocks.length,
          },
        };
      });
  }

  async get(id: string) {
    const today = todayIso();
    return {
      hotel: this.hotel(id),
      seasons: this.seasons.filter((s) => s.hotelId === id).sort((a, b) => a.startDate.localeCompare(b.startDate)),
      allotments: this.allotments.filter((a) => a.hotelId === id).map((a) => withAllotmentState(a, today)),
      stopSales: this.stops.filter((s) => s.hotelId === id),
      today,
    };
  }

  async create(input: HotelInput) {
    const now = new Date().toISOString();
    const h: Hotel = {
      ...input,
      id: memoryId(),
      branchId: "",
      childPolicy: input.childPolicy ?? { ...DEFAULT_CHILD_POLICY },
      cancellation: input.cancellation ?? { ...DEFAULT_CANCELLATION },
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.hotels.push(h);
    return h;
  }

  async update(id: string, input: HotelInput) {
    const prev = this.hotel(id);
    const next: Hotel = {
      ...prev,
      ...input,
      childPolicy: input.childPolicy ?? prev.childPolicy,
      cancellation: input.cancellation ?? prev.cancellation,
      isActive: input.isActive ?? prev.isActive,
      updatedAt: new Date().toISOString(),
    };
    this.hotels = this.hotels.map((h) => (h.id === id ? next : h));
    return next;
  }

  async saveSeason(hotelId: string, seasonId: string | null, input: SeasonInput) {
    this.hotel(hotelId);
    const season: Season = { ...input, id: seasonId ?? memoryId(), hotelId };
    if (overlappingSeason(season, this.seasons.filter((s) => s.hotelId === hotelId))) throw new Error("season overlaps");
    this.seasons = seasonId ? this.seasons.map((s) => (s.id === seasonId ? season : s)) : [...this.seasons, season];
    return season;
  }

  async deleteSeason(_hotelId: string, seasonId: string) {
    this.seasons = this.seasons.filter((s) => s.id !== seasonId);
  }

  async saveAllotment(hotelId: string, allotmentId: string | null, input: AllotmentInput) {
    this.hotel(hotelId);
    const prev = this.allotments.find((a) => a.id === allotmentId);
    const row = {
      ...input,
      releaseDays: input.kind === "on_request" ? 0 : input.releaseDays,
      id: allotmentId ?? memoryId(),
      hotelId,
      sold: prev?.sold ?? 0,
    };
    this.allotments = allotmentId ? this.allotments.map((a) => (a.id === allotmentId ? row : a)) : [...this.allotments, row];
    return withAllotmentState(row, todayIso());
  }

  async adjustAllotment(_hotelId: string, allotmentId: string, delta: number) {
    const a = this.allotments.find((x) => x.id === allotmentId);
    if (!a) throw new Error("allotment not found");
    a.sold = Math.min(a.rooms, Math.max(0, a.sold + delta));
    return withAllotmentState(a, todayIso());
  }

  async deleteAllotment(_hotelId: string, allotmentId: string) {
    this.allotments = this.allotments.filter((a) => a.id !== allotmentId);
  }

  async createStopSale(hotelId: string, input: StopSaleInput) {
    const s: StopSale = { ...input, id: memoryId(), hotelId, createdAt: new Date().toISOString() };
    this.stops.push(s);
    return s;
  }

  async deleteStopSale(_hotelId: string, stopSaleId: string) {
    this.stops = this.stops.filter((s) => s.id !== stopSaleId);
  }

  async quote(): Promise<Quote> {
    throw new Error("quotes need the server");
  }
}

export function createHotelRepository(client: HttpClient = http): HotelRepository {
  return createRepository<HotelRepository>({
    api: new ApiHotelRepository(client),
    memory: new MemoryHotelRepository(),
    reads: ["list", "get"],
  });
}
