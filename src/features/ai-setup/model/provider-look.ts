import { Bot, Feather, Gem, type LucideIcon } from "lucide-react";
import type { AIProvider } from "@/entities/ai";
import type { Tone } from "@/shared/ui";

export const PROVIDER_LOOK: Record<AIProvider, { icon: LucideIcon; tone: Tone }> = {
  openai: { icon: Bot, tone: "emerald" },
  anthropic: { icon: Feather, tone: "amber" },
  gemini: { icon: Gem, tone: "sky" },
};
