/** Contracted hotels: master data, seasonal net rate matrices, policies and inventory. */

export const ROOM_TYPES = ["standard", "superior", "deluxe", "family", "suite", "triple", "quad"] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const MEAL_PLANS = ["ro", "bb", "hb", "fb", "ai"] as const;
export type MealPlan = (typeof MEAL_PLANS)[number];

export const LANDMARKS = ["haram", "nabawi", "city_center", "airport"] as const;
export type Landmark = (typeof LANDMARKS)[number];

export const SEASON_KINDS = ["low", "shoulder", "high", "peak"] as const;
export type SeasonKind = (typeof SEASON_KINDS)[number];

export const HOTEL_CURRENCIES = ["SAR", "USD", "EUR", "TRY"] as const;

export const OCCUPANCIES = ["single", "double", "triple", "quad"] as const;
export type Occupancy = (typeof OCCUPANCIES)[number];

export type MarkupKind = "percent" | "fixed";
/** Percent values are basis points (1500 = 15%); fixed is minor units per paying guest per night. */
export type Markup = { kind: MarkupKind; value: number };

export type ChildMode = "free" | "percent" | "fixed";
/** Percent is a whole percentage (0-100) of the adult per-person rate. */
export type ChildRule = { mode: ChildMode; value: number };

/** Age breaks are exclusive upper bounds: infants are 0-1.99 when `infantMaxAge` is 2. */
export type ChildPolicy = {
  infantMaxAge: number;
  child1MaxAge: number;
  child2MaxAge: number;
  infant: ChildRule;
  child1: ChildRule;
  child2WithBed: ChildRule;
  child2NoBed: ChildRule;
  extraBedAdult: number;
};

export type PenaltyKind = "nights" | "percent";
export type PenaltyTier = { minDays: number; kind: PenaltyKind; value: number };
export type CancellationPolicy = { freeDays: number; tiers: PenaltyTier[]; noShowPct: number };

export type HotelLocation = {
  city: string;
  country: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  landmark: Landmark | "";
  distanceM: number;
};

export type HotelContact = {
  salesName: string;
  salesPhone: string;
  salesEmail: string;
  reservationsEmail: string;
};

export type Hotel = {
  id: string;
  branchId: string;
  name: string;
  nameAr: string;
  stars: number;
  location: HotelLocation;
  contact: HotelContact;
  roomTypes: RoomType[];
  mealPlans: MealPlan[];
  currency: string;
  markup: Markup;
  childPolicy: ChildPolicy;
  cancellation: CancellationPolicy;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HotelSummary = {
  seasonName: string;
  seasonKind: SeasonKind | "";
  fromNet: number;
  roomsTotal: number;
  roomsSold: number;
  nextRelease: string | null;
  stopSaleToday: boolean;
  contractFiles: number;
  seasonsCount: number;
  allotmentCount: number;
};

export type HotelListItem = Hotel & { summary: HotelSummary };

/** One matrix row, per night: single is per room, double/triple/quad per person sharing. */
export type Rate = {
  roomType: RoomType;
  mealPlan: MealPlan;
  single: number;
  double: number;
  triple: number;
  quad: number;
};

export type Season = {
  id: string;
  hotelId: string;
  name: string;
  kind: SeasonKind;
  startDate: string;
  endDate: string;
  /** Overrides the hotel markup when set. */
  markup: Markup | null;
  rates: Rate[];
};

export type AllotmentKind = "guaranteed" | "on_request";
export type AllotmentStatus = "open" | "sold_out" | "released" | "expired";

export type Allotment = {
  id: string;
  hotelId: string;
  roomType: RoomType;
  kind: AllotmentKind;
  startDate: string;
  endDate: string;
  rooms: number;
  sold: number;
  releaseDays: number;
  notes: string;
  releaseDate: string;
  status: AllotmentStatus;
  available: number;
};

export type StopSale = {
  id: string;
  hotelId: string;
  startDate: string;
  endDate: string;
  /** Empty means every room type. */
  roomType: RoomType | "";
  reason: string;
  createdAt: string;
};

export type HotelDetail = {
  hotel: Hotel;
  seasons: Season[];
  allotments: Allotment[];
  stopSales: StopSale[];
  today: string;
};

export type HotelInput = {
  name: string;
  nameAr: string;
  stars: number;
  location: HotelLocation;
  contact: HotelContact;
  roomTypes: RoomType[];
  mealPlans: MealPlan[];
  currency: string;
  markup: Markup;
  childPolicy?: ChildPolicy;
  cancellation?: CancellationPolicy;
  notes: string;
  isActive?: boolean;
};

export type SeasonInput = {
  name: string;
  kind: SeasonKind;
  startDate: string;
  endDate: string;
  markup: Markup | null;
  rates: Rate[];
};

export type AllotmentInput = {
  roomType: RoomType;
  kind: AllotmentKind;
  startDate: string;
  endDate: string;
  rooms: number;
  releaseDays: number;
  notes: string;
};

export type StopSaleInput = {
  startDate: string;
  endDate: string;
  roomType: RoomType | "";
  reason: string;
};

export type QuoteChild = { age: number; bed: boolean };

export type QuoteRequest = {
  checkIn: string;
  checkOut: string;
  roomType: RoomType;
  mealPlan: MealPlan;
  rooms: number;
  adults: number;
  children: QuoteChild[];
  extraBed: boolean;
};

export type QuoteAvailability = "instant" | "on_request" | "stop_sale" | "unavailable";
export type AgeBand = "infant" | "child1" | "child2" | "adult";

export type QuoteNight = {
  date: string;
  seasonName: string;
  seasonKind: SeasonKind | "";
  net: number;
  gross: number;
  priced: boolean;
  stopSale: boolean;
};

export type QuotePenaltyLine = { minDays: number; kind: PenaltyKind; value: number; amount: number; from: string };

export type Quote = {
  currency: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  adults: number;
  guests: number;
  roomType: RoomType;
  mealPlan: MealPlan;
  netTotal: number;
  grossTotal: number;
  profit: number;
  bookable: boolean;
  availability: QuoteAvailability;
  allotmentLeft: number;
  missingDates: string[];
  stopSaleDates: string[];
  children: { age: number; band: AgeBand; bed: boolean; net: number }[];
  nightsDetail: QuoteNight[];
  cancellation: {
    freeUntil: string;
    freeNow: boolean;
    penaltyToday: number;
    tiers: QuotePenaltyLine[];
    noShow: number;
  };
};

export type HotelListFilter = { query?: string; city?: string; activeOnly?: boolean };
