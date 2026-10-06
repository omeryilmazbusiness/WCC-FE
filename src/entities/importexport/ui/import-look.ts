import {
  Banknote,
  CalendarDays,
  CalendarRange,
  CircleCheckBig,
  CircleX,
  Coins,
  FilePlus2,
  FileUp,
  Hash,
  History,
  Loader,
  type LucideIcon,
  PencilLine,
  Phone,
  PlaneTakeoff,
  RefreshCcw,
  Sheet,
  Tag,
  TriangleAlert,
  Type,
  Users,
  Wallet,
} from "lucide-react";
import type { Tone } from "@/shared/ui";
import type { ImportEntityType, ImportMode } from "../model";
import type { JobPhase } from "../lib/import-plan";

export type Look = { icon: LucideIcon; tone: Tone };

export const ENTITY_LOOK: Record<ImportEntityType, Look> = {
  customers: { icon: Users, tone: "sky" },
  bookings: { icon: CalendarRange, tone: "amber" },
  payments: { icon: Wallet, tone: "emerald" },
  departures: { icon: PlaneTakeoff, tone: "violet" },
};

export const MODE_LOOK: Record<ImportMode, Look> = {
  upsert: { icon: RefreshCcw, tone: "indigo" },
  create: { icon: FilePlus2, tone: "emerald" },
  update: { icon: PencilLine, tone: "amber" },
};

export const PHASE_LOOK: Record<JobPhase, Look> = {
  draft: { icon: PencilLine, tone: "zinc" },
  running: { icon: Loader, tone: "sky" },
  done: { icon: CircleCheckBig, tone: "emerald" },
  partial: { icon: TriangleAlert, tone: "amber" },
  failed: { icon: CircleX, tone: "rose" },
};

export type Section = "import" | "export" | "history";

export const SECTION_LOOK: Record<Section, Look> = {
  import: { icon: FileUp, tone: "sky" },
  export: { icon: Sheet, tone: "emerald" },
  history: { icon: History, tone: "indigo" },
};

const FIELD_TYPE_ICON: Record<string, LucideIcon> = {
  phone: Phone,
  date: CalendarDays,
  money: Banknote,
  int: Hash,
  currency: Coins,
  status: Tag,
};

export function fieldTypeIcon(type: string): LucideIcon {
  return FIELD_TYPE_ICON[type] ?? Type;
}
