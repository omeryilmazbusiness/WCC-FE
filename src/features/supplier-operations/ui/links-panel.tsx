"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, CheckCircle2, Hash, Link2, Package, Plus, Trash2, Wrench, type LucideIcon } from "lucide-react";
import { LINK_TYPES, type Supplier, type SupplierLink, type SupplierLinkType, type SupplierRepository } from "@/entities/supplier";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { parseMoneyInput } from "@/shared/lib/money";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { ActionDialog, Button, ChoiceGrid, ConfirmDialog, EmptyState, Field, IconInput, InfoSection, MoneyInput, QueryState, Stepper, TONES, useMutationFeedback, type Tone } from "@/shared/ui";

const LINK_LOOK: Record<SupplierLinkType, { icon: LucideIcon; tone: Tone }> = {
  package: { icon: Package, tone: "violet" },
  departure: { icon: CalendarClock, tone: "sky" },
  service: { icon: Wrench, tone: "teal" },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { supplier: Supplier; repository: SupplierRepository };

/** Allotments held with the supplier per package, departure or service, with confirmation tracking. */
export function SupplierLinksPanel({ supplier, repository }: Props) {
  const t = useTranslations("suppliers.links");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const canWrite = useCan("suppliers.write");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<SupplierLink | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const query = useApiQuery(() => repository.listLinks(supplier.id), [repository, supplier.id], { cacheKey: ["supplier-links", supplier.id] });
  const links = query.data ?? [];

  async function confirm(link: SupplierLink) {
    setBusy(link.id);
    try {
      const next = await repository.confirmLink(link.id);
      query.setData((ls) => (ls ?? []).map((l) => (l.id === next.id ? next : l)));
      feedback.success(t("confirmed"));
    } catch (e) {
      feedback.error(e, t("actionError"));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!removing) return;
    const link = removing;
    try {
      await repository.deleteLink(supplier.id, link.id);
      query.setData((ls) => (ls ?? []).filter((l) => l.id !== link.id));
      feedback.success(t("removed"));
      setRemoving(null);
    } catch (e) {
      feedback.error(e, t("actionError"));
    }
  }

  return (
    <InfoSection
      icon={Link2}
      tone="sky"
      title={t("title")}
      badge={links.length ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">{links.length}</span> : null}
      action={
        canWrite ? (
          <Button size="sm" onClick={() => setAdding(true)} data-testid="supplier-link-new">
            <Plus className="h-4 w-4" aria-hidden />
            {t("add")}
          </Button>
        ) : null
      }
      data-testid="supplier-links"
    >
      <QueryState loading={query.loading && !query.data} error={query.error} onRetry={() => void query.reload()}>
        {links.length === 0 ? (
          <EmptyState icon={Link2} title={t("empty")} description={t("emptyHint")} />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {links.map((l) => {
              const look = LINK_LOOK[l.linkType];
              const Icon = look.icon;
              const pct = l.allotment > 0 ? Math.min(100, Math.round((l.sold / l.allotment) * 100)) : 0;
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES[look.tone].soft)} aria-hidden>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-semibold text-zinc-900">
                      {t(`type.${l.linkType}`)}
                      <span className="font-mono text-[11.5px] font-medium text-zinc-400" dir="ltr">
                        {l.linkId.slice(0, 8)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10.5px] font-bold",
                          l.confirmationStatus === "confirmed" ? "bg-emerald-50 text-emerald-700" : l.confirmationStatus === "cancelled" ? "bg-zinc-100 text-zinc-500" : "bg-amber-50 text-amber-700",
                        )}
                      >
                        {t(`status.${l.confirmationStatus}`)}
                      </span>
                      {l.oversold ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold text-rose-700">{t("oversold")}</span> : null}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-100">
                        <div className={cn("h-full rounded-full", l.oversold ? "bg-rose-500" : "bg-sky-500")} style={{ width: `${l.allotment ? pct : 0}%` }} />
                      </div>
                      <span className="text-[12px] tabular-nums text-zinc-500">
                        {t("sold", { sold: l.sold, total: l.allotment || "∞" })} · {formatMoney(l.unitCost, locale, l.currency)}
                      </span>
                    </div>
                  </div>
                  {canWrite ? (
                    <div className="flex gap-1.5">
                      {l.confirmationStatus === "pending" ? (
                        <Button size="sm" disabled={busy === l.id} onClick={() => void confirm(l)}>
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                          {t("confirm")}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => setRemoving(l)} aria-label={t("remove")}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
      <AddLinkDialog open={adding} onOpenChange={setAdding} supplier={supplier} repository={repository} onAdded={(l) => query.setData((ls) => [l, ...(ls ?? [])])} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(v) => !v && setRemoving(null)}
        title={t("removeTitle")}
        description={t("removeHint")}
        confirmLabel={t("remove")}
        cancelLabel={tc("cancel")}
        destructive
        onConfirm={() => void remove()}
      />
    </InfoSection>
  );
}

function AddLinkDialog({
  open,
  onOpenChange,
  supplier,
  repository,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplier: Supplier;
  repository: SupplierRepository;
  onAdded: (l: SupplierLink) => void;
}) {
  const t = useTranslations("suppliers.links");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [linkType, setLinkType] = useState<SupplierLinkType>("departure");
  const [linkId, setLinkId] = useState("");
  const [allotment, setAllotment] = useState(0);
  const [unitCost, setUnitCost] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLinkType("departure");
    setLinkId("");
    setAllotment(0);
    setUnitCost("");
  }, [open]);

  const cost = unitCost.trim() ? parseMoneyInput(unitCost) : 0;
  const idOk = UUID.test(linkId.trim());
  const valid = idOk && cost !== null && !saving;

  async function submit() {
    if (!valid || cost === null) return;
    setSaving(true);
    try {
      const l = await repository.addLink(supplier.id, { linkType, linkId: linkId.trim(), allotment, unitCost: cost, currency: supplier.finance.currency });
      feedback.success(t("added"));
      onAdded(l);
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("actionError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Link2}
      tone="sky"
      title={t("addTitle")}
      description={t("addSubtitle")}
      testId="supplier-link-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!valid} onClick={() => void submit()} data-testid="supplier-link-submit">
            {saving ? t("saving") : t("add")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <ChoiceGrid
          name="link-type"
          columns={3}
          value={linkType}
          onChange={setLinkType}
          options={LINK_TYPES.map((lt) => ({ value: lt, label: t(`type.${lt}`), ...LINK_LOOK[lt] }))}
        />
        <Field label={t("linkId")} htmlFor="link-id" hint={t("linkIdHint")}>
          <IconInput id="link-id" icon={Hash} dir="ltr" className="font-mono text-[13px]" value={linkId} onChange={(e) => setLinkId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
          {linkId.trim() && !idOk ? <p className="text-[12px] font-medium text-rose-600">{t("linkIdError")}</p> : null}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("allotment")} hint={t("allotmentHint")}>
            <Stepper label={t("allotment")} value={allotment} onChange={setAllotment} min={0} max={10000} />
          </Field>
          <Field label={t("unitCost")} htmlFor="link-cost">
            <MoneyInput id="link-cost" currency={supplier.finance.currency} value={unitCost} onChange={setUnitCost} />
          </Field>
        </div>
      </div>
    </ActionDialog>
  );
}
