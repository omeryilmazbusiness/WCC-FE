import {
  Briefcase,
  CircleCheckBig,
  CircleSlash,
  Crown,
  Headset,
  LockKeyhole,
  type LucideIcon,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";
import type { AppRole } from "@/shared/config/routes";
import type { Tone } from "@/shared/ui";
import type { MemberStatus } from "../lib/team";

export type Look = { icon: LucideIcon; tone: Tone };

export const ROLE_LOOK: Record<AppRole, Look> = {
  gm: { icon: Crown, tone: "violet" },
  manager: { icon: Briefcase, tone: "indigo" },
  operations: { icon: Truck, tone: "amber" },
  finance: { icon: Wallet, tone: "emerald" },
  employee: { icon: Headset, tone: "sky" },
  admin: { icon: ShieldCheck, tone: "zinc" },
};

export const STATUS_LOOK: Record<MemberStatus, Look> = {
  active: { icon: CircleCheckBig, tone: "emerald" },
  inactive: { icon: CircleSlash, tone: "zinc" },
  locked: { icon: LockKeyhole, tone: "rose" },
};
