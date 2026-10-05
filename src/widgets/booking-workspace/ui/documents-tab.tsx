"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Eye, FolderOpen, Plane, Receipt, ScrollText, Share2, Ticket, type LucideIcon } from "lucide-react";
import {
  DOCUMENT_KINDS,
  DOCUMENT_LANGS,
  renderBookingDocument,
  type DocumentData,
  type DocumentKind,
  type DocumentLang,
} from "@/entities/booking";
import { cn } from "@/shared/lib/cn";
import { Button, SegmentedControl, TONES, useToast, type Tone } from "@/shared/ui";
import { WorkspaceSection } from "./section";

const LOOK: Record<DocumentKind, { icon: LucideIcon; tone: Tone }> = {
  voucher: { icon: Ticket, tone: "emerald" },
  eticket: { icon: Plane, tone: "sky" },
  proforma: { icon: Receipt, tone: "amber" },
  contract: { icon: ScrollText, tone: "violet" },
};

type Props = {
  data: DocumentData;
  onShare: (kind: DocumentKind) => void;
};

function defaultLang(locale: string): DocumentLang {
  return locale === "ar" ? "ar" : locale === "tr" ? "tr" : "en";
}

/** Opens the document in a new tab; the toolbar there prints or saves it as PDF. */
function openDocument(html: string): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.opener = null;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.document.querySelector("[data-print]")?.addEventListener("click", () => w.print());
  return true;
}

export function DocumentsTab({ data, onShare }: Props) {
  const t = useTranslations("bookingWorkspace.documents");
  const locale = useLocale();
  const toast = useToast();
  const [lang, setLang] = useState<DocumentLang>(defaultLang(locale));

  const preview = (kind: DocumentKind) => {
    if (!openDocument(renderBookingDocument(kind, lang, data))) toast.push({ title: t("popupBlocked"), tone: "error" });
  };

  return (
    <div className="space-y-4" data-testid="booking-tab-documents">
      <WorkspaceSection
        icon={FolderOpen}
        tone="indigo"
        title={t("title")}
        aside={
          <SegmentedControl<DocumentLang>
            value={lang}
            onChange={setLang}
            aria-label={t("language")}
            options={DOCUMENT_LANGS.map((l) => ({ value: l, label: t(`lang.${l}`) }))}
          />
        }
      >
        <p className="mb-3 text-[13px] text-zinc-500">{t("hint")}</p>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {DOCUMENT_KINDS.map((kind) => {
            const { icon: Icon, tone } = LOOK[kind];
            return (
              <li key={kind} className={cn("rounded-[22px] border border-zinc-200/60 bg-gradient-to-br p-4", TONES[tone].tint)} data-testid={`doc-${kind}`}>
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TONES[tone].gradient)} aria-hidden>
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-zinc-950">{t(`kind.${kind}`)}</span>
                    <span className="block truncate text-[12.5px] text-zinc-500">{t(`kindHint.${kind}`)}</span>
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => preview(kind)} data-testid={`doc-open-${kind}`}>
                    <Eye className="h-4 w-4" aria-hidden />
                    {t("open")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onShare(kind)}>
                    <Share2 className="h-4 w-4" aria-hidden />
                    {t("share")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </WorkspaceSection>
    </div>
  );
}
