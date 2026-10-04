import {
  Accessibility,
  Armchair,
  Award,
  BedDouble,
  BedSingle,
  Briefcase,
  Building2,
  CalendarClock,
  CarFront,
  Coffee,
  Compass,
  Crown,
  Flame,
  Gem,
  Leaf,
  Luggage,
  Martini,
  Plane,
  Route,
  Salad,
  Scale,
  Sofa,
  Soup,
  Sparkles,
  Stamp,
  Timer,
  UserRound,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/shared/ui";
import type {
  BoardType,
  CabinClass,
  LeadIntent,
  LeadPriority,
  LeadSegment,
  LeadService,
  TripPreference,
} from "../model";

export type Look = { icon: LucideIcon; tone: Tone };

/** Icon and color per requested service. */
export const SERVICE_LOOK: Record<LeadService, Look> = {
  flight: { icon: Plane, tone: "sky" },
  hotel: { icon: BedDouble, tone: "violet" },
  tour: { icon: Compass, tone: "emerald" },
  visa: { icon: Stamp, tone: "amber" },
  transfer: { icon: CarFront, tone: "teal" },
  other: { icon: Sparkles, tone: "zinc" },
};

export const SEGMENT_LOOK: Record<LeadSegment, Look> = {
  b2c: { icon: UserRound, tone: "sky" },
  b2b: { icon: Building2, tone: "indigo" },
};

export const PRIORITY_LOOK: Record<LeadPriority, Look> = {
  high: { icon: Flame, tone: "rose" },
  medium: { icon: Timer, tone: "amber" },
  low: { icon: Leaf, tone: "emerald" },
};

export const INTENT_LOOK: Record<LeadIntent, Look> = {
  ready: { icon: Zap, tone: "emerald" },
  comparing: { icon: Scale, tone: "amber" },
  planning: { icon: CalendarClock, tone: "sky" },
};

export const CABIN_LOOK: Record<CabinClass, Look> = {
  economy: { icon: Armchair, tone: "sky" },
  premium_economy: { icon: Sofa, tone: "teal" },
  business: { icon: Briefcase, tone: "indigo" },
  first: { icon: Crown, tone: "amber" },
};

export const BOARD_LOOK: Record<BoardType, Look> = {
  room_only: { icon: BedSingle, tone: "zinc" },
  bed_breakfast: { icon: Coffee, tone: "amber" },
  half_board: { icon: Soup, tone: "teal" },
  full_board: { icon: UtensilsCrossed, tone: "sky" },
  all_inclusive: { icon: Martini, tone: "violet" },
  ultra_all_inclusive: { icon: Gem, tone: "rose" },
};

export const PREFERENCE_LOOK: Record<TripPreference, Look> = {
  direct_flight: { icon: Route, tone: "sky" },
  extra_baggage: { icon: Luggage, tone: "amber" },
  use_miles: { icon: Award, tone: "violet" },
  seat_selection: { icon: Armchair, tone: "teal" },
  special_meal: { icon: Salad, tone: "emerald" },
  accessibility: { icon: Accessibility, tone: "indigo" },
};
