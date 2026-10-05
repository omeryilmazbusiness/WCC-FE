import {
  BedDouble,
  BedSingle,
  BookOpen,
  Building2,
  BusFront,
  CalendarRange,
  Coffee,
  Crown,
  Droplets,
  Flag,
  Footprints,
  Gem,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Hourglass,
  Landmark,
  Luggage,
  MapPin,
  Moon,
  MoonStar,
  Mountain,
  Plane,
  PlaneTakeoff,
  Shirt,
  Soup,
  Sparkles,
  Star,
  Sunrise,
  Tent,
  TrainFront,
  Trees,
  Users,
  UsersRound,
  UtensilsCrossed,
  Baby,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/shared/ui";

export type Look = { icon: LucideIcon; tone: Tone };

export const KIND_LOOK: Record<string, Look> = {
  umrah: { icon: Moon, tone: "emerald" },
  hajj: { icon: Landmark, tone: "amber" },
};

export const CATEGORY_LOOK: Record<string, Look> = {
  economy: { icon: Wallet, tone: "teal" },
  standard: { icon: Star, tone: "sky" },
  luxury: { icon: Crown, tone: "amber" },
  boutique: { icon: Gem, tone: "violet" },
  ramadan_first15: { icon: MoonStar, tone: "indigo" },
  ramadan_last15: { icon: MoonStar, tone: "violet" },
  ramadan_full: { icon: Sparkles, tone: "emerald" },
  semester: { icon: GraduationCap, tone: "sky" },
  short: { icon: Hourglass, tone: "sky" },
  long: { icon: CalendarRange, tone: "emerald" },
  special_mujamala: { icon: HeartHandshake, tone: "rose" },
  special_commercial: { icon: Handshake, tone: "indigo" },
};

export const TRANSPORT_LOOK: Record<string, Look> = {
  flight_scheduled: { icon: Plane, tone: "sky" },
  flight_charter: { icon: PlaneTakeoff, tone: "indigo" },
  road: { icon: BusFront, tone: "amber" },
};

export const BOARD_LOOK: Record<string, Look> = {
  bb: { icon: Coffee, tone: "amber" },
  hb: { icon: Soup, tone: "teal" },
  fb: { icon: UtensilsCrossed, tone: "emerald" },
  tabldot: { icon: Soup, tone: "rose" },
  buffet: { icon: UtensilsCrossed, tone: "violet" },
};

export const ACCESS_LOOK: Record<string, Look> = {
  walking: { icon: Footprints, tone: "emerald" },
  shuttle: { icon: BusFront, tone: "sky" },
};

export const INTERCITY_LOOK: Record<string, Look> = {
  haramain_train: { icon: TrainFront, tone: "emerald" },
  bus: { icon: BusFront, tone: "amber" },
};

export const VISA_LOOK: Record<string, Look> = {
  UMRAH_VISA: { icon: Moon, tone: "emerald" },
  TOURIST_VISA: { icon: MapPin, tone: "sky" },
  PERSONAL_VISIT: { icon: Users, tone: "violet" },
  HAJJ_VISA: { icon: Landmark, tone: "amber" },
  BUSINESS_VISIT: { icon: Building2, tone: "indigo" },
};

export const KIT_LOOK: Record<string, LucideIcon> = {
  ihram: Shirt,
  luggage: Luggage,
  prayer_book: BookOpen,
  zamzam: Droplets,
};

export const ZIYARAT_LOOK: Record<string, LucideIcon> = {
  thawr: Mountain,
  arafat: Sunrise,
  muzdalifah: Moon,
  mina: Tent,
  hira: Mountain,
  jannat_al_mualla: Trees,
  uhud: Flag,
  qiblatayn: Landmark,
  seven_mosques: Building2,
  quba: Landmark,
  baqi: Trees,
};

export const TIER_LOOK: Record<string, LucideIcon> = {
  QUAD: UsersRound,
  TRIPLE: Users,
  DOUBLE: BedDouble,
  SINGLE: BedSingle,
  INFANT: Baby,
  CHILD_2_6: Baby,
  CHILD_6_11_BED: BedSingle,
  CHILD_6_11_NOBED: Users,
};

export const CITY_TONE: Record<string, Tone> = {
  makkah: "emerald",
  madinah: "sky",
  jeddah: "amber",
  transit: "violet",
  "": "zinc",
};

export const fallbackLook: Look = { icon: Star, tone: "zinc" };

export function lookOf(map: Record<string, Look>, key: string): Look {
  return map[key] ?? fallbackLook;
}
