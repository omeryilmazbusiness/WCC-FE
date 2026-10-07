"use client";

import { useEffect, useState } from "react";
import { ChartNoAxesCombined, MessageSquareText, ListChecks, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { AssistantOrb } from "./assistant-orb";

const SUGGESTIONS: readonly { id: "summary" | "leads" | "revenue" | "followUp"; icon: LucideIcon; tint: string }[] = [
  { id: "summary", icon: ListChecks, tint: "bg-sky-100 text-sky-600" },
  { id: "leads", icon: Users, tint: "bg-violet-100 text-violet-600" },
  { id: "revenue", icon: ChartNoAxesCombined, tint: "bg-emerald-100 text-emerald-600" },
  { id: "followUp", icon: MessageSquareText, tint: "bg-amber-100 text-amber-600" },
];

type DayPart = "morning" | "afternoon" | "evening";

function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

/** First screen of a new chat: greeting plus one-tap starter questions. */
export function AssistantEmpty({ firstName, onPick }: { firstName: string; onPick: (prompt: string) => void }) {
  const t = useTranslations("assistant");
  // Greeting depends on the viewer's clock, so it is resolved after hydration.
  const [part, setPart] = useState<DayPart | null>(null);
  useEffect(() => setPart(dayPart(new Date().getHours())), []);

  return (
    <div className="flex min-h-full flex-col justify-end gap-6 px-1 pb-2 pt-8">
      <div className="flex flex-col items-center text-center">
        <AssistantOrb size="xl" />
        <h3 className="mt-5 text-[22px] font-semibold tracking-tight text-zinc-950">
          {part ? t(`greeting.${part}`, { name: firstName }) : t("greeting.default", { name: firstName })}
        </h3>
        <p className="mt-1.5 max-w-[290px] text-[14px] leading-relaxed text-zinc-500">{t("intro")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5" data-testid="assistant-suggestions">
        {SUGGESTIONS.map(({ id, icon: Icon, tint }, i) => {
          const prompt = t(`suggestions.${id}.prompt`);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPick(prompt)}
              className="animate-assistant-pop group flex flex-col items-start gap-2.5 rounded-2xl bg-white p-3 text-start shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-zinc-950/[0.06] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_rgba(15,23,42,0.35)] active:scale-[0.98]"
              style={{ animationDelay: `${80 + i * 50}ms` }}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${tint}`}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-[13px] font-semibold leading-snug text-zinc-900">{t(`suggestions.${id}.title`)}</span>
              <span className="-mt-1.5 line-clamp-2 text-[12px] leading-snug text-zinc-500">{prompt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
