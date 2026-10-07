import { Sparkles } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const SIZE = {
  xs: { box: "h-6 w-6", icon: "h-3 w-3" },
  sm: { box: "h-8 w-8", icon: "h-4 w-4" },
  md: { box: "h-10 w-10", icon: "h-5 w-5" },
  lg: { box: "h-14 w-14", icon: "h-6 w-6" },
  xl: { box: "h-20 w-20", icon: "h-9 w-9" },
} as const;

/** The assistant's mark: a slowly turning colour orb with a sparkle, like Siri / Copilot. */
export function AssistantOrb({ size = "md", still = false, className }: { size?: keyof typeof SIZE; still?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_8px_24px_-10px_rgba(99,102,241,0.75)]",
        SIZE[size].box,
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-[-40%] bg-[conic-gradient(from_0deg,#38bdf8,#818cf8,#c084fc,#f472b6,#fb923c,#38bdf8)]",
          !still && "animate-assistant-orb",
        )}
      />
      <span className="absolute inset-[1.5px] rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.55),rgba(255,255,255,0)_55%)]" />
      <Sparkles className={cn("relative text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]", SIZE[size].icon)} strokeWidth={2.2} />
    </span>
  );
}
