import {
  Ban,
  BedDouble,
  BedSingle,
  Building2,
  CalendarClock,
  CircleCheck,
  Coffee,
  Crown,
  Gem,
  Hourglass,
  Landmark,
  Leaf,
  MapPin,
  Moon,
  Plane,
  ShieldCheck,
  Soup,
  Sparkles,
  Sun,
  Thermometer,
  UsersRound,
  UtensilsCrossed,
  Wine,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/shared/ui";
import type { AllotmentKind, AllotmentStatus, Landmark as LandmarkKey, MealPlan, QuoteAvailability, RoomType, SeasonKind } from "../model";

export type Look = { icon: LucideIcon; tone: Tone };

export const ROOM_LOOK: Record<RoomType, Look> = {
  standard: { icon: BedDouble, tone: "sky" },
  superior: { icon: Sparkles, tone: "indigo" },
  deluxe: { icon: Gem, tone: "violet" },
  family: { icon: UsersRound, tone: "emerald" },
  suite: { icon: Crown, tone: "amber" },
  triple: { icon: BedSingle, tone: "teal" },
  quad: { icon: Building2, tone: "rose" },
};

export const MEAL_LOOK: Record<MealPlan, Look> = {
  ro: { icon: BedDouble, tone: "zinc" },
  bb: { icon: Coffee, tone: "amber" },
  hb: { icon: Soup, tone: "teal" },
  fb: { icon: UtensilsCrossed, tone: "emerald" },
  ai: { icon: Wine, tone: "violet" },
};

export const SEASON_LOOK: Record<SeasonKind, Look> = {
  low: { icon: Leaf, tone: "emerald" },
  shoulder: { icon: Thermometer, tone: "sky" },
  high: { icon: Sun, tone: "amber" },
  peak: { icon: Sparkles, tone: "rose" },
};

export const LANDMARK_LOOK: Record<LandmarkKey, Look> = {
  haram: { icon: Moon, tone: "emerald" },
  nabawi: { icon: Landmark, tone: "teal" },
  city_center: { icon: MapPin, tone: "sky" },
  airport: { icon: Plane, tone: "indigo" },
};

export const ALLOTMENT_KIND_LOOK: Record<AllotmentKind, Look> = {
  guaranteed: { icon: ShieldCheck, tone: "emerald" },
  on_request: { icon: Hourglass, tone: "amber" },
};

export const ALLOTMENT_STATUS_LOOK: Record<AllotmentStatus, Look> = {
  open: { icon: CircleCheck, tone: "emerald" },
  sold_out: { icon: XCircle, tone: "rose" },
  released: { icon: CalendarClock, tone: "zinc" },
  expired: { icon: CalendarClock, tone: "zinc" },
};

export const AVAILABILITY_LOOK: Record<QuoteAvailability, Look> = {
  instant: { icon: CircleCheck, tone: "emerald" },
  on_request: { icon: Hourglass, tone: "amber" },
  stop_sale: { icon: Ban, tone: "rose" },
  unavailable: { icon: XCircle, tone: "zinc" },
};
