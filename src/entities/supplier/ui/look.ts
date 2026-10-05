import {
  ArrowDownToLine,
  Ban,
  BedDouble,
  Boxes,
  Bus,
  CalendarX,
  CircleCheck,
  CircleHelp,
  CircleX,
  Compass,
  CreditCard,
  FileSignature,
  FlaskConical,
  HandCoins,
  Package,
  Plane,
  PlugZap,
  PowerOff,
  Rocket,
  Rss,
  Scale,
  ShieldPlus,
  ShoppingCart,
  SlidersHorizontal,
  Stamp,
  TriangleAlert,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/shared/ui";
import type {
  AvailabilityWarning,
  BlockReason,
  DisputeStatus,
  EntryKind,
  Environment,
  HealthStatus,
  IntegrationType,
  PaymentModel,
  Product,
  SupplierCategory,
} from "../model";

export type Look = { icon: LucideIcon; tone: Tone };

export const CATEGORY_LOOK: Record<SupplierCategory, Look> = {
  gds: { icon: Plane, tone: "sky" },
  wholesaler: { icon: BedDouble, tone: "indigo" },
  dmc: { icon: Compass, tone: "emerald" },
  transfer: { icon: Bus, tone: "amber" },
  visa: { icon: Stamp, tone: "violet" },
  insurance: { icon: ShieldPlus, tone: "teal" },
  other: { icon: Boxes, tone: "zinc" },
};

export const HEALTH_LOOK: Record<HealthStatus, Look> = {
  active: { icon: CircleCheck, tone: "emerald" },
  degraded: { icon: TriangleAlert, tone: "amber" },
  down: { icon: CircleX, tone: "rose" },
  unknown: { icon: CircleHelp, tone: "zinc" },
};

export const INTEGRATION_LOOK: Record<IntegrationType, Look> = {
  api: { icon: PlugZap, tone: "sky" },
  feed: { icon: Rss, tone: "amber" },
  manual: { icon: FileSignature, tone: "zinc" },
};

export const ENVIRONMENT_LOOK: Record<Environment, Look> = {
  sandbox: { icon: FlaskConical, tone: "amber" },
  production: { icon: Rocket, tone: "emerald" },
};

export const PAYMENT_LOOK: Record<PaymentModel, Look> = {
  prepaid: { icon: Wallet, tone: "emerald" },
  postpaid: { icon: HandCoins, tone: "indigo" },
  card: { icon: CreditCard, tone: "violet" },
};

export const ENTRY_LOOK: Record<EntryKind, Look> = {
  topup: { icon: ArrowDownToLine, tone: "emerald" },
  charge: { icon: ShoppingCart, tone: "rose" },
  refund: { icon: Undo2, tone: "sky" },
  payment: { icon: HandCoins, tone: "indigo" },
  adjustment: { icon: SlidersHorizontal, tone: "zinc" },
};

export const PRODUCT_LOOK: Record<Product, Look> = {
  flight: { icon: Plane, tone: "sky" },
  hotel: { icon: BedDouble, tone: "indigo" },
  transfer: { icon: Bus, tone: "amber" },
  visa: { icon: Stamp, tone: "violet" },
  insurance: { icon: ShieldPlus, tone: "teal" },
  package: { icon: Package, tone: "emerald" },
};

export const BLOCK_LOOK: Record<BlockReason, Look> = {
  inactive: { icon: PowerOff, tone: "zinc" },
  contract_expired: { icon: CalendarX, tone: "rose" },
  down: { icon: CircleX, tone: "rose" },
  deposit_exhausted: { icon: Wallet, tone: "rose" },
  credit_exhausted: { icon: CreditCard, tone: "rose" },
};

export const WARNING_LOOK: Record<AvailabilityWarning, Look> = {
  low_balance: { icon: Wallet, tone: "amber" },
  contract_expiring: { icon: CalendarX, tone: "amber" },
  degraded: { icon: TriangleAlert, tone: "amber" },
};

export const DISPUTE_LOOK: Record<DisputeStatus, Look> = {
  open: { icon: Scale, tone: "amber" },
  resolved: { icon: CircleCheck, tone: "emerald" },
  rejected: { icon: Ban, tone: "zinc" },
};
