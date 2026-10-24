import { Armchair, BusFront, Crown, Layers } from "lucide-react";
import type { Tone } from "@/shared/ui/tone";
import type { VehicleClass } from "./model";

export const CLASS_LOOK: Record<VehicleClass, { icon: typeof BusFront; tone: Tone }> = {
  standard: { icon: BusFront, tone: "sky" },
  vip: { icon: Crown, tone: "amber" },
  sleeper: { icon: Armchair, tone: "violet" },
  mixed: { icon: Layers, tone: "indigo" },
};
