"use client";

import { ArrowUpRight, BookOpen, Database, History, Info, Sparkles, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { faqAnchor } from "@/entities/faq";
import { SHOWN_NOTICES, type ReplyMeta, type ReplySource } from "@/entities/assistant";
import { SETTINGS_ROOT } from "@/shared/config/settings";
import { Link } from "@/shared/i18n/navigation";

const SOURCE_ICON: Partial<Record<ReplySource, LucideIcon>> = {
  faq: BookOpen,
  data: Database,
  cache: History,
};

/** Where an answer came from, why it is short, and (for Help & FAQ hits) a way to ask the assistant instead. */
export function ReplyMetaLine({ meta, onAskAI }: { meta: ReplyMeta; onAskAI?: () => void }) {
  const t = useTranslations("assistant.meta");
  const Icon = SOURCE_ICON[meta.source];
  const notice = meta.notice && SHOWN_NOTICES.has(meta.notice) ? meta.notice : null;

  return (
    <div className="mt-2 space-y-1.5" data-testid="assistant-meta" data-source={meta.source} data-notice={meta.notice ?? ""}>
      {notice ? (
        <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[12px] leading-snug text-amber-800" data-testid="assistant-notice">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{t(`notices.${notice}`)}</span>
        </p>
      ) : null}
      {Icon || onAskAI ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {Icon ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-zinc-100 px-2 text-[11.5px] font-medium text-zinc-600" data-testid="assistant-source">
              <Icon className="h-3 w-3" aria-hidden />
              {t(`sources.${meta.source}`)}
            </span>
          ) : null}
          {meta.faq ? (
            <Link
              href={`${SETTINGS_ROOT}/faq#${faqAnchor(meta.faq.topic, meta.faq.id)}`}
              className="inline-flex h-6 items-center gap-0.5 rounded-full px-2 text-[11.5px] font-semibold text-[#007AFF] hover:bg-[#007AFF]/10"
              data-testid="assistant-faq-link"
            >
              {t("openHelp")}
              <ArrowUpRight className="h-3 w-3 rtl:-scale-x-100" aria-hidden />
            </Link>
          ) : null}
          {onAskAI ? (
            <button
              type="button"
              onClick={onAskAI}
              className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold text-violet-600 hover:bg-violet-50"
              data-testid="assistant-ask-ai"
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              {t("askAI")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
