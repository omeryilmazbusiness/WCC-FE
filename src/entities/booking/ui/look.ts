import {
  BedDouble,
  Building2,
  Bus,
  CircleDollarSign,
  CircleSlash,
  Clock3,
  FileCheck2,
  Globe,
  Headset,
  Hourglass,
  Landmark,
  Map as MapIcon,
  MessageCircle,
  Plane,
  RefreshCcw,
  RotateCcw,
  Stamp,
  Ticket,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/shared/ui";
import type { PaymentStatus, SalesChannel, ServiceType, TicketStatus } from "../model";

export type Look = { icon: LucideIcon; tone: Tone };

export const SERVICE_LOOK: Record<ServiceType, Look> = {
  flight: { icon: Plane, tone: "sky" },
  hotel: { icon: BedDouble, tone: "violet" },
  package: { icon: Landmark, tone: "emerald" },
  transfer: { icon: Bus, tone: "amber" },
  visa: { icon: Stamp, tone: "rose" },
  tour: { icon: MapIcon, tone: "teal" },
};

export const TICKET_LOOK: Record<TicketStatus, Look> = {
  pending: { icon: Hourglass, tone: "zinc" },
  option: { icon: Clock3, tone: "amber" },
  issued: { icon: Ticket, tone: "emerald" },
  reissued: { icon: RefreshCcw, tone: "indigo" },
  cancelled: { icon: CircleSlash, tone: "rose" },
  refunded: { icon: RotateCcw, tone: "violet" },
};

export const PAYMENT_LOOK: Record<PaymentStatus, Look> = {
  none: { icon: CircleDollarSign, tone: "zinc" },
  awaiting: { icon: Hourglass, tone: "amber" },
  deposit: { icon: Wallet, tone: "sky" },
  paid: { icon: FileCheck2, tone: "emerald" },
  overdue: { icon: TriangleAlert, tone: "rose" },
};

export const CHANNEL_LOOK: Record<SalesChannel, Look> = {
  b2c_web: { icon: Globe, tone: "sky" },
  b2b_agency: { icon: Building2, tone: "indigo" },
  whatsapp_bot: { icon: MessageCircle, tone: "emerald" },
  agent: { icon: Headset, tone: "violet" },
};
