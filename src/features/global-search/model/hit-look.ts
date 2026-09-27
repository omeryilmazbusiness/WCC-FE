import { CalendarCheck2, IdCard, Kanban, Search, Users, type LucideIcon } from "lucide-react";
import type { SearchHit } from "@/entities/search";
import { routes } from "@/shared/config/routes";
import type { Tone } from "@/shared/ui";

const LOOK: Record<string, { icon: LucideIcon; tone: Tone }> = {
  customer: { icon: Users, tone: "sky" },
  lead: { icon: Kanban, tone: "indigo" },
  booking: { icon: CalendarCheck2, tone: "emerald" },
  passport: { icon: IdCard, tone: "violet" },
};

export function hitLook(hit: SearchHit): { icon: LucideIcon; tone: Tone } {
  return LOOK[hit.entityType] ?? { icon: Search, tone: "zinc" };
}

const HINT_ROUTES: Record<string, string> = {
  customers: routes.customers,
  bookings: routes.bookings,
  leads: routes.pipeline,
  pipeline: routes.pipeline,
  inbox: routes.inbox,
};

/** Passport hits carry the participant id, so they open the bookings list, not a record. */
export function hitHref(hit: SearchHit): string {
  switch (hit.entityType) {
    case "customer":
      return routes.customer(hit.id);
    case "booking":
      return routes.booking(hit.id);
    case "lead":
      return routes.pipeline;
    default:
      return HINT_ROUTES[hit.hrefHint] ?? routes.workspace;
  }
}
