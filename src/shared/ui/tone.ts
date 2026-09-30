/**
 * One colour vocabulary for tiles, icons and badges. Class names are spelled out in full
 * so Tailwind can see them.
 */
export const TONES = {
  sky: {
    soft: "bg-sky-50 text-sky-700",
    solid: "bg-sky-500 text-white shadow-[0_8px_18px_-8px_rgba(14,165,233,0.7)]",
    tint: "from-sky-50 via-white to-white",
    text: "text-sky-600",
    dot: "bg-sky-500",
    stroke: "stroke-sky-500",
    gradient: "bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_14px_28px_-12px_rgba(14,165,233,0.55)]",
  },
  indigo: {
    soft: "bg-indigo-50 text-indigo-700",
    solid: "bg-indigo-500 text-white shadow-[0_8px_18px_-8px_rgba(99,102,241,0.7)]",
    tint: "from-indigo-50 via-white to-white",
    text: "text-indigo-600",
    dot: "bg-indigo-500",
    stroke: "stroke-indigo-500",
    gradient: "bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-[0_14px_28px_-12px_rgba(99,102,241,0.55)]",
  },
  emerald: {
    soft: "bg-emerald-50 text-emerald-700",
    solid: "bg-emerald-500 text-white shadow-[0_8px_18px_-8px_rgba(16,185,129,0.7)]",
    tint: "from-emerald-50 via-white to-white",
    text: "text-emerald-600",
    dot: "bg-emerald-500",
    stroke: "stroke-emerald-500",
    gradient: "bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_14px_28px_-12px_rgba(16,185,129,0.55)]",
  },
  amber: {
    soft: "bg-amber-50 text-amber-700",
    solid: "bg-amber-500 text-white shadow-[0_8px_18px_-8px_rgba(245,158,11,0.7)]",
    tint: "from-amber-50 via-white to-white",
    text: "text-amber-600",
    dot: "bg-amber-500",
    stroke: "stroke-amber-500",
    gradient: "bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-[0_14px_28px_-12px_rgba(245,158,11,0.55)]",
  },
  rose: {
    soft: "bg-rose-50 text-rose-700",
    solid: "bg-rose-500 text-white shadow-[0_8px_18px_-8px_rgba(244,63,94,0.7)]",
    tint: "from-rose-50 via-white to-white",
    text: "text-rose-600",
    dot: "bg-rose-500",
    stroke: "stroke-rose-500",
    gradient: "bg-gradient-to-br from-rose-400 to-pink-600 text-white shadow-[0_14px_28px_-12px_rgba(244,63,94,0.55)]",
  },
  violet: {
    soft: "bg-violet-50 text-violet-700",
    solid: "bg-violet-500 text-white shadow-[0_8px_18px_-8px_rgba(139,92,246,0.7)]",
    tint: "from-violet-50 via-white to-white",
    text: "text-violet-600",
    dot: "bg-violet-500",
    stroke: "stroke-violet-500",
    gradient: "bg-gradient-to-br from-violet-400 to-purple-600 text-white shadow-[0_14px_28px_-12px_rgba(139,92,246,0.55)]",
  },
  teal: {
    soft: "bg-teal-50 text-teal-700",
    solid: "bg-teal-500 text-white shadow-[0_8px_18px_-8px_rgba(20,184,166,0.7)]",
    tint: "from-teal-50 via-white to-white",
    text: "text-teal-600",
    dot: "bg-teal-500",
    stroke: "stroke-teal-500",
    gradient: "bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow-[0_14px_28px_-12px_rgba(20,184,166,0.55)]",
  },
  zinc: {
    soft: "bg-zinc-100 text-zinc-600",
    solid: "bg-zinc-800 text-white shadow-[0_8px_18px_-8px_rgba(24,24,27,0.6)]",
    tint: "from-zinc-50 via-white to-white",
    text: "text-zinc-600",
    dot: "bg-zinc-400",
    stroke: "stroke-zinc-700",
    gradient: "bg-gradient-to-br from-zinc-600 to-zinc-900 text-white shadow-[0_14px_28px_-12px_rgba(24,24,27,0.45)]",
  },
} as const;

export type Tone = keyof typeof TONES;
