import {
  CircleCheckBig,
  CircleSlash,
  Crown,
  Headset,
  LockKeyhole,
  type LucideIcon,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { AppRole } from "@/shared/config/routes";
import type { Tone } from "@/shared/ui";
import type { MemberStatus } from "../lib/team";

export type Look = { icon: LucideIcon; tone: Tone };

export const ROLE_LOOK: Record<AppRole, Look> = {
  gm: { icon: Crown, tone: "violet" },
  finance: { icon: Wallet, tone: "emerald" },
  agent: { icon: Headset, tone: "sky" },
  admin: { icon: ShieldCheck, tone: "zinc" },
};

export const STATUS_LOOK: Record<MemberStatus, Look> = {
  active: { icon: CircleCheckBig, tone: "emerald" },
  inactive: { icon: CircleSlash, tone: "zinc" },
  locked: { icon: LockKeyhole, tone: "rose" },
};
