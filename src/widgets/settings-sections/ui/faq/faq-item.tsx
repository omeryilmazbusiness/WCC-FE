"use client";

import { ChevronDown, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { faqAnchor, type FaqEntry } from "@/entities/faq";
import { cn } from "@/shared/lib/cn";
import { useToast } from "@/shared/ui";
import { Highlight } from "./highlight";

type Props = {
  entry: FaqEntry;
  open: boolean;
  onToggle: () => void;
  terms: readonly string[];
};

/** One question as a disclosure row; the answer carries a copyable deep link. */
export function FaqItem({ entry, open, onToggle, terms }: Props) {
  const t = useTranslations("faq.ui");
  const { push } = useToast();
  const anchor = faqAnchor(entry.topic, entry.id);

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}#${anchor}`;
    window.history.replaceState(null, "", `#${anchor}`);
    try {
      await navigator.clipboard.writeText(url);
      push({ title: t("linkCopied"), tone: "success" });
    } catch {
      // Clipboard can be blocked; the address bar already holds the link.
    }
  }

  return (
    <div id={anchor} className="scroll-mt-32" data-testid="faq-item" data-open={open || undefined}>
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${anchor}-answer`}
          className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-zinc-50"
          data-testid="faq-question"
        >
          <span className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-zinc-950">
            <Highlight text={entry.question} terms={terms} />
          </span>
          <ChevronDown
            className={cn("h-[18px] w-[18px] shrink-0 text-zinc-400 transition-transform duration-300", open && "rotate-180")}
            strokeWidth={2.4}
            aria-hidden
          />
        </button>
      </h3>
      <div
        id={`${anchor}-answer`}
        role="region"
        aria-label={entry.question}
        className="animate-setup-in"
        hidden={!open}
      >
        <div className="flex items-start gap-2 px-4 pb-4">
            <p className="min-w-0 flex-1 text-[14px] leading-relaxed text-zinc-600" data-testid="faq-answer">
              <Highlight text={entry.answer} terms={terms} />
            </p>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              aria-label={t("copyLink")}
              title={t("copyLink")}
            >
              <Link2 className="h-4 w-4" aria-hidden />
            </button>
        </div>
      </div>
    </div>
  );
}
