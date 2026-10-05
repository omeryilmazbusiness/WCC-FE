"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { footerSources, type FxLiveBoard } from "../model";

/** Source attribution (always visible — required by the providers) plus the expandable disclaimer. */
export function LiveFxSources({ board, className }: { board: FxLiveBoard | null; className?: string }) {
  const t = useTranslations("fxLive");
  const disclaimerId = useId();
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 leading-5" data-testid="fx-live-sources">
          <span className="font-medium text-zinc-600">{t("sources")}: </span>
          {footerSources(board?.sources ?? []).map((source, i) => (
            <span key={source.id || source.name}>
              {i > 0 ? " · " : null}
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-700 underline-offset-2 hover:text-zinc-950 hover:underline"
                >
                  {source.attribution || source.name}
                </a>
              ) : (
                source.attribution || source.name
              )}
              {!source.ok ? (
                <span className="text-amber-700" title={source.error || undefined}>
                  {" "}
                  ({t("sourceUnavailable")})
                </span>
              ) : null}
            </span>
          ))}
        </p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={disclaimerId}
          aria-label={t("disclaimer")}
          title={t("disclaimer")}
          onClick={() => setOpen((v) => !v)}
          className="rounded-full p-0.5 text-zinc-400 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </div>
      <p id={disclaimerId} hidden={!open} className="leading-5">
        {board?.disclaimer || t("disclaimerFallback")}
      </p>
    </div>
  );
}
