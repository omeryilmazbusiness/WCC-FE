"use client";

import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import type { LeadFromConversation } from "../model/use-lead-from-conversation";

/** The AI call to action: reads the chat and opens a pre-filled lead form. */
export function AILeadButton({ flow }: { flow: LeadFromConversation }) {
  const t = useTranslations("inbox");
  if (!flow.enabled || !flow.canAI) return null;
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={flow.busy}
        onClick={() => void flow.fillWithAI()}
        data-testid="lead-from-conversation-ai"
        className="group relative flex items-center gap-3 overflow-hidden rounded-[20px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-500 px-3 py-3 text-start text-white shadow-[0_14px_30px_-18px_rgba(124,58,237,0.9)] transition-[box-shadow,transform] duration-300 hover:shadow-[0_18px_36px_-16px_rgba(124,58,237,0.95)] active:scale-[0.98] disabled:opacity-70"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/20 ring-1 ring-inset ring-white/30">
          {flow.busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Sparkles className="h-5 w-5" aria-hidden />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold">
            {flow.busy ? t("leadDraftReading") : flow.hasLead ? t("leadDraftComplete") : t("leadDraftCreate")}
          </span>
          <span className="block truncate text-[11.5px] text-white/80">{t("leadDraftHint")}</span>
        </span>
      </button>
      {flow.needsAI ? (
        <div className="rounded-2xl bg-violet-50 px-3 py-2.5 text-xs text-violet-900 ring-1 ring-inset ring-violet-100">
          <p>{t("leadDraftNoAI")}</p>
          {flow.canSetupAI ? (
            <Link href={routes.aiSetup} className="mt-1 inline-block font-semibold text-violet-700 hover:underline">
              {t("leadDraftConnect")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
