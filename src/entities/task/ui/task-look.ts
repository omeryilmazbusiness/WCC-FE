import {
  ArrowDownCircle,
  CircleCheckBig,
  CircleDashed,
  CircleSlash,
  FileText,
  Flame,
  Loader,
  PhoneCall,
  SignalHigh,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/shared/ui";
import type { TaskKind, TaskPriority, TaskStatus } from "../model";

export type TaskLook = { icon: LucideIcon; tone: Tone };

/** Icon and color per status; the single source for columns, stats and badges. */
export const TASK_STATUS_LOOK: Record<TaskStatus, TaskLook> = {
  open: { icon: CircleDashed, tone: "sky" },
  in_progress: { icon: Loader, tone: "violet" },
  done: { icon: CircleCheckBig, tone: "emerald" },
  cancelled: { icon: CircleSlash, tone: "zinc" },
};

export const TASK_KIND_LOOK: Record<TaskKind, TaskLook> = {
  followup: { icon: PhoneCall, tone: "indigo" },
  document: { icon: FileText, tone: "teal" },
  payment: { icon: Wallet, tone: "emerald" },
  custom: { icon: Sparkles, tone: "amber" },
};

export const TASK_PRIORITY_LOOK: Record<TaskPriority, TaskLook> = {
  critical: { icon: Flame, tone: "rose" },
  major: { icon: SignalHigh, tone: "amber" },
  minor: { icon: ArrowDownCircle, tone: "sky" },
};
