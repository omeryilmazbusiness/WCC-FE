"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search, Stamp } from "lucide-react";
import { VISA_LOOK, createTourPackageRepository, lookOf, type TourPackage } from "@/entities/tourpackage";
import { defaultDepartureId, packageName, searchPackages, todayLocal, usePackageCatalog } from "@/features/package-link";
import { formatMoney } from "@/shared/lib/format";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, EmptyState, GlyphTile, IconInput, TONES } from "@/shared/ui";
import { applyVisaPick, visaOffersOf, visaPickFromOffer } from "../model/visa-pick";
import type { BookingDraft, VisaPick } from "../model/draft";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: BookingDraft;
  customerId?: string | null;
  serviceKey?: string;
  onPicked: (next: Partial<BookingDraft>) => void;
};

/** Full-desk visa catalogue: pick a package type and its priced offer. */
export function PickVisaDialog({ open, onOpenChange, draft, customerId, serviceKey, onPicked }: Props) {
  const t = useTranslations("bookings.form");
  const tp = useTranslations("packages");
  const locale = useLocale();
  const { packages, loading, refresh } = usePackageCatalog(open);
  const [q, setQ] = useState("");
  const [repo] = useState(createTourPackageRepository);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const list = useMemo(
    () => searchPackages(packages, q, { kind: "visa", customerId, keepId: draft.visa?.packageId }),
    [packages, q, customerId, draft.visa?.packageId],
  );

  async function choose(pkg: TourPackage, type: string) {
    const deps = await repo.listDepartures(pkg.id);
    const slot = defaultDepartureId(deps, todayLocal());
    const label = `${tp(`visa.${type}`)} · ${packageName(pkg, locale)}`;
    const pick = visaPickFromOffer(pkg, type, slot, label);
    if (!pick) return;
    onPicked(applyVisaPick(draft, pick, { serviceKey }));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[80]"
        className="z-[80] flex h-[min(92vh,920px)] w-[min(96vw,1100px)] max-w-none flex-col gap-0 overflow-hidden bg-[#f7f5f6] p-0 sm:p-0"
        data-testid="create-booking-visa-dialog"
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-zinc-200/60 bg-white/80 px-5 py-4 backdrop-blur-xl sm:px-8 sm:py-5">
          <div className="flex items-center gap-3.5 pe-10">
            <GlyphTile icon={Stamp} tone="rose" size="xl" />
            <div className="min-w-0">
              <DialogTitle className="text-[20px] leading-tight tracking-tight sm:text-[22px]">{t("pickVisaTitle")}</DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-snug sm:text-[13.5px]">{t("pickVisaHint")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="shrink-0 border-b border-zinc-200/50 bg-white/60 px-5 py-4 sm:px-8">
          <IconInput icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("pickVisaSearch")} data-testid="create-booking-visa-search" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
          {loading ? (
            <p className="py-16 text-center text-[13.5px] font-medium text-zinc-500">{t("visaSearching")}</p>
          ) : list.length === 0 ? (
            <EmptyState icon={Stamp} title={t("visaEmpty")} description={t("visaEmptyHint")} />
          ) : (
            <ol className="space-y-4">
              {list.map((pkg) => (
                <VisaPackageBlock
                  key={pkg.id}
                  pkg={pkg}
                  selected={draft.visa}
                  locale={locale}
                  onChoose={(type) => void choose(pkg, type)}
                />
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VisaPackageBlock({
  pkg,
  selected,
  locale,
  onChoose,
}: {
  pkg: TourPackage;
  selected: VisaPick | null;
  locale: string;
  onChoose: (type: string) => void;
}) {
  const t = useTranslations("packages");
  const tb = useTranslations("bookings.form");
  const offers = visaOffersOf(pkg);
  const name = packageName(pkg, locale);
  return (
    <li className="rounded-[26px] bg-white p-4 ring-1 ring-rose-100/80 sm:p-5" data-testid={`create-booking-visa-pkg-${pkg.id}`}>
      <div className="mb-3 flex items-center gap-3">
        <GlyphTile icon={Stamp} tone="rose" size="section" />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-zinc-950">{name}</p>
          <p className="text-[12.5px] font-medium text-zinc-500">
            <span dir="ltr">{pkg.code}</span>
            {" · "}
            {t(`category.${pkg.category}`)}
          </p>
        </div>
      </div>
      {offers.length === 0 ? (
        <p className="text-[13px] font-medium text-zinc-500">{tb("visaNoTypes")}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {offers.map((offer) => {
            const look = lookOf(VISA_LOOK, offer.type);
            const Icon = look.icon;
            const active = selected?.packageId === pkg.id && selected.type === offer.type;
            return (
              <li key={offer.type}>
                <Button
                  type="button"
                  variant={active ? "default" : "outline"}
                  className="h-auto w-full justify-start gap-3 rounded-[20px] px-3.5 py-3"
                  data-testid={`create-booking-visa-offer-${offer.type}`}
                  onClick={() => onChoose(offer.type)}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${TONES[look.tone].soft}`}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block truncate text-[14px] font-semibold">{t(`visa.${offer.type}`)}</span>
                    <span className="block text-[12px] font-medium text-zinc-500">
                      {formatMoney(offer.sell, locale, pkg.baseCurrency)}
                      {offer.processingDays ? ` · ${offer.processingDays}d` : ""}
                    </span>
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
