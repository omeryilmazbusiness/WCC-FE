import { CalendarPlus, ClipboardCheck, Sparkles, Users, UserRound } from "lucide-react";
import { SERVICE_LOOK, type Look } from "@/entities/booking/ui/look";
import type { BookingCreateStep, BookingServiceKind } from "../model/draft";

/** Visual tokens for the create-booking wizard. Presentation only — no draft rules. */
export const CREATE_LOOK: Look = { icon: CalendarPlus, tone: "emerald" };

export const STEP_LOOK: Record<BookingCreateStep, Look> = {
  party: { icon: UserRound, tone: "violet" },
  trip: SERVICE_LOOK.package,
  travellers: { icon: Users, tone: "amber" },
  services: { icon: Sparkles, tone: "sky" },
  review: { icon: ClipboardCheck, tone: "indigo" },
};

export const KIND_LOOK: Record<BookingServiceKind, Look> = {
  package: SERVICE_LOOK.package,
  hotel: SERVICE_LOOK.hotel,
  flight: SERVICE_LOOK.flight,
  transfer: SERVICE_LOOK.transfer,
  visa: SERVICE_LOOK.visa,
  tour: SERVICE_LOOK.tour,
  extras: { icon: Sparkles, tone: "zinc" },
};
