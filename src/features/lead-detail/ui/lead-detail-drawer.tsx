"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  hasTripInterest,
  type Lead,
  type LeadRepository,
  type StageHistoryItem,
} from "@/entities/lead";
import { createTourPackageRepository } from "@/entities/tourpackage";
import { useCan } from "@/entities/viewer";
import { AssignLeadDialog } from "@/features/assign-lead";
import { LeadStageMenu } from "@/features/change-lead-stage";
import { ConvertLeadDialog } from "@/features/convert-lead";
import { LeadFormDialog } from "@/features/create-lead";
import { formatDateTime, formatDay, formatMoney } from "@/shared/lib/format";
import {
  Badge,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  useMutationFeedback,
} from "@/shared/ui";

type Props = {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repository: LeadRepository;
  onChanged: (lead: Lead) => void;
};

export function LeadDetailDrawer({
  lead,
  open,
  onOpenChange,
  repository,
  onChanged,
}: Props) {
  const t = useTranslations("pipeline");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const canWrite = useCan("leads.write");
  const [history, setHistory] = useState<StageHistoryItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [packageLabel, setPackageLabel] = useState("");
  const packageId = lead?.interest.packageId ?? null;

  useEffect(() => {
    if (!packageId || !open) {
      setPackageLabel("");
      return;
    }
    void createTourPackageRepository()
      .listPackages(false)
      .then((rows) => {
        const p = rows.find((r) => r.id === packageId);
        setPackageLabel(p ? `${p.code} · ${locale === "ar" && p.nameAr ? p.nameAr : p.nameEn}` : "");
      })
      .catch(() => setPackageLabel(""));
  }, [packageId, open, locale]);

  useEffect(() => {
    if (!lead || !open) return;
    void repository
      .history(lead.id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [lead, open, repository]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {lead ? (
          <>
            <DrawerHeader>
              <DrawerTitle>{lead.fullName}</DrawerTitle>
              <DrawerDescription>
                {lead.phone}
                {lead.source ? ` · ${lead.source}` : ""}
              </DrawerDescription>
            </DrawerHeader>
            <DrawerBody className="space-y-5">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase text-zinc-500">
                    {t("fields.stage")}
                  </dt>
                  <dd className="mt-1 font-medium">{t(`stages.${lead.stage}`)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-zinc-500">
                    {t("fields.owner")}
                  </dt>
                  <dd className="mt-1 font-medium">{lead.ownerName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-zinc-500">
                    {t("fields.customer")}
                  </dt>
                  <dd className="mt-1 font-medium">
                    {lead.customerId ? lead.customerId.slice(0, 8) : t("noCustomer")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-zinc-500">
                    {t("noFollowUp")}
                  </dt>
                  <dd className="mt-1">
                    {lead.noFollowUp ? (
                      <Badge className="bg-amber-100 text-amber-900">
                        {t("noFollowUpYes")}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>

              <section className="rounded-2xl border border-zinc-200/80 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-zinc-950">{t("tripTitle")}</h3>
                {hasTripInterest(lead.interest) ? (
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <TripItem
                      label={t("fields.travelDate")}
                      value={
                        lead.interest.travelDate
                          ? formatDay(lead.interest.travelDate, locale)
                          : lead.interest.travelWindow
                      }
                      hint={lead.interest.travelDate ? lead.interest.travelWindow : ""}
                    />
                    <TripItem
                      label={t("fields.travellers")}
                      value={lead.interest.paxCount ? String(lead.interest.paxCount) : ""}
                    />
                    <TripItem
                      label={t("fields.budget")}
                      value={
                        lead.interest.budgetAmount != null && lead.interest.budgetCurrency
                          ? formatMoney(lead.interest.budgetAmount, locale, lead.interest.budgetCurrency)
                          : ""
                      }
                    />
                    <TripItem
                      label={t("fields.package")}
                      value={packageLabel || lead.interest.packageInterest}
                    />
                  </dl>
                ) : (
                  <p className="text-sm text-zinc-500">{t("tripEmpty")}</p>
                )}
              </section>

              {lead.notes ? (
                <p className="rounded-2xl bg-zinc-50 p-3 text-sm text-zinc-700 whitespace-pre-wrap">
                  {lead.notes}
                </p>
              ) : null}

              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-950">
                  {t("historyTitle")}
                </h3>
                {history.length === 0 ? (
                  <p className="text-sm text-zinc-500">{t("historyEmpty")}</p>
                ) : (
                  <ol className="space-y-2">
                    {history.map((h) => (
                      <li
                        key={h.id}
                        className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {h.fromStage ? (
                            <span className="text-zinc-500">
                              {t(`stages.${h.fromStage as "new"}`)}
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                          <span aria-hidden>→</span>
                          <span className="font-semibold">
                            {t(`stages.${h.toStage as "new"}`)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatDateTime(h.createdAt, locale)}
                          {h.note ? ` · ${h.note}` : ""}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </DrawerBody>
            <DrawerFooter className="flex flex-wrap gap-2">
              {canWrite ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                  {t("edit")}
                </Button>
              ) : null}
              <LeadStageMenu
                lead={lead}
                repository={repository}
                onChanged={onChanged}
              />
              <AssignLeadDialog
                lead={lead}
                repository={repository}
                onAssigned={onChanged}
              />
              <ConvertLeadDialog
                lead={lead}
                repository={repository}
                onConverted={(updated) => onChanged(updated)}
              />
              {canWrite && lead.stage !== "won" && lead.stage !== "lost" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const updated = await repository.setNoFollowUp(
                        lead.id,
                        !lead.noFollowUp,
                      );
                      onChanged(updated);
                    } catch (err) {
                      feedback.error(err);
                    }
                  }}
                >
                  {lead.noFollowUp ? t("clearNoFollowUp") : t("markNoFollowUp")}
                </Button>
              ) : null}
            </DrawerFooter>
            <LeadFormDialog
              repository={repository}
              open={editing}
              onOpenChange={setEditing}
              lead={lead}
              onSaved={onChanged}
            />
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function TripItem({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-zinc-500">{label}</dt>
      <dd className="mt-1 font-medium text-zinc-900">{value || "—"}</dd>
      {hint ? <dd className="text-xs text-zinc-500">{hint}</dd> : null}
    </div>
  );
}
