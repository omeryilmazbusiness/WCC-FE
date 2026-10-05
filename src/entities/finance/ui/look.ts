import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Ban,
  Banknote,
  BadgeCheck,
  CircleDashed,
  CreditCard,
  HandCoins,
  Landmark,
  Receipt,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/shared/ui";
import type { AccountKind, AgeingBucket, BspStatus, LetterStatus, MatchStatus, MovementKind, RiskLevel } from "../model";

export type Look = { icon: LucideIcon; tone: Tone };

export const ACCOUNT_LOOK: Record<AccountKind, Look> = {
  bank: { icon: Landmark, tone: "indigo" },
  cash: { icon: Banknote, tone: "emerald" },
  pos: { icon: CreditCard, tone: "violet" },
  wallet: { icon: Wallet, tone: "sky" },
};

export const MOVEMENT_LOOK: Record<MovementKind, Look> = {
  collection: { icon: ArrowDownLeft, tone: "emerald" },
  supplier_payment: { icon: ArrowUpRight, tone: "amber" },
  transfer: { icon: ArrowLeftRight, tone: "sky" },
  expense: { icon: Receipt, tone: "rose" },
  refund: { icon: RotateCcw, tone: "violet" },
  adjustment: { icon: SlidersHorizontal, tone: "zinc" },
};

export const MATCH_LOOK: Record<MatchStatus, Look> = {
  na: { icon: CircleDashed, tone: "zinc" },
  unmatched: { icon: AlertTriangle, tone: "amber" },
  matched: { icon: BadgeCheck, tone: "emerald" },
  ignored: { icon: Ban, tone: "zinc" },
};

export const RISK_LOOK: Record<RiskLevel, Look> = {
  ok: { icon: ShieldCheck, tone: "emerald" },
  watch: { icon: AlertTriangle, tone: "amber" },
  critical: { icon: ShieldAlert, tone: "rose" },
  blocked: { icon: Ban, tone: "zinc" },
};

export const BUCKET_TONE: Record<AgeingBucket, Tone> = {
  current: "emerald",
  d0_15: "amber",
  d16_30: "rose",
  d31_plus: "violet",
  unscheduled: "zinc",
};

export const BSP_LOOK: Record<BspStatus, Look> = {
  matched: { icon: BadgeCheck, tone: "emerald" },
  amount_mismatch: { icon: AlertTriangle, tone: "amber" },
  missing_in_system: { icon: ShieldAlert, tone: "rose" },
  missing_in_bsp: { icon: CircleDashed, tone: "violet" },
};

export const LETTER_LOOK: Record<LetterStatus, Look> = {
  sent: { icon: HandCoins, tone: "sky" },
  confirmed: { icon: BadgeCheck, tone: "emerald" },
  disputed: { icon: AlertTriangle, tone: "rose" },
  expired: { icon: Ban, tone: "zinc" },
};
