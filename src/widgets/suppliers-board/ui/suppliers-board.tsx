"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Truck } from "lucide-react";
import {
  createSupplierRepository,
  LINK_TYPES,
  type IssueEvent,
  type Supplier,
  type SupplierLink,
  type SupplierLinkType,
  type SupplierRepository,
} from "@/entities/supplier";
import { SupplierInvoicesPanel } from "@/features/supplier-invoices";
import { cn } from "@/shared/lib/cn";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Screen,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@/shared/ui";

type Props = { repository?: SupplierRepository };
type DetailTab = "links" | "invoices" | "issues";

export function SuppliersBoard({ repository }: Props) {
  const repo = useMemo(
    () => repository ?? createSupplierRepository(),
    [repository],
  );
  const t = useTranslations("ops");
  const { push } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detailTab, setDetailTab] = useState<DetailTab>("links");
  const [links, setLinks] = useState<SupplierLink[]>([]);
  const [issues, setIssues] = useState<IssueEvent[]>([]);
  const [issueNote, setIssueNote] = useState("");
  const [unconfirmed, setUnconfirmed] = useState<SupplierLink[]>([]);
  const [oversold, setOversold] = useState<SupplierLink[]>([]);
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [linkType, setLinkType] = useState<SupplierLinkType>("departure");
  const [linkId, setLinkId] = useState("");
  const [allotment, setAllotment] = useState("0");
  const [unitCost, setUnitCost] = useState("0");
  const [confirmRef, setConfirmRef] = useState("");

  const refresh = useCallback(async () => {
    const [list, unc, over] = await Promise.all([
      repo.list(),
      repo.listUnconfirmed(),
      repo.listOversold(),
    ]);
    setSuppliers(list);
    setUnconfirmed(unc);
    setOversold(over);
    const sid = selectedId || list[0]?.id || "";
    if (sid && sid !== selectedId) setSelectedId(sid);
    if (sid) setLinks(await repo.listLinks(sid));
    else setLinks([]);
  }, [repo, selectedId]);

  useEffect(() => {
    void refresh().catch(() => push({ title: t("loadError"), tone: "error" }));
  }, [refresh, push, t]);

  useEffect(() => {
    if (!selectedId) return;
    void repo
      .listLinks(selectedId)
      .then(setLinks)
      .catch(() => setLinks([]));
    void repo
      .listIssues(selectedId)
      .then(setIssues)
      .catch(() => setIssues([]));
  }, [selectedId, repo]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      push({ title: t("saved"), tone: "success" });
    } catch (e) {
      push({
        title: t("actionError"),
        description: e instanceof Error ? e.message : undefined,
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen data-testid="suppliers-board" className="!space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            {t("suppliersTitle")}
          </h1>
          <p className="text-[13px] text-zinc-500">{t("suppliersSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge className="bg-amber-50 text-amber-900">
            {t("unconfirmed")}: {unconfirmed.length}
          </Badge>
          <Badge className="bg-rose-50 text-rose-800">
            {t("oversold")}: {oversold.length}
          </Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_28px_-14px_rgba(15,23,42,0.22)]">
        <div className="grid gap-0 lg:grid-cols-[240px_1fr]">
          <aside className="border-b border-zinc-100 bg-zinc-50/80 p-3 lg:border-b-0 lg:border-e">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              <Truck className="h-3.5 w-3.5" />
              {t("supplierList")}
            </p>
            {suppliers.length === 0 ? (
              <EmptyState title={t("suppliersEmpty")} />
            ) : (
              <ul className="space-y-1">
                {suppliers.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        "w-full rounded-xl px-3 py-2 text-start text-sm transition",
                        selectedId === s.id
                          ? "bg-sky-600 text-white shadow-sm"
                          : "text-zinc-700 hover:bg-white",
                      )}
                    >
                      <span className="block font-semibold">
                        {s.nameEn || s.nameAr || s.code}
                      </span>
                      <span
                        className={cn(
                          "text-[11px]",
                          selectedId === s.id ? "text-sky-100" : "text-zinc-400",
                        )}
                      >
                        {s.code}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 space-y-2 border-t border-zinc-200/80 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                {t("createSupplier")}
              </p>
              <Input
                className="h-8"
                placeholder={t("code")}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Input
                className="h-8"
                placeholder={t("nameEn")}
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
              />
              <Button
                size="sm"
                className="w-full"
                disabled={busy || !code.trim()}
                onClick={() =>
                  void run(async () => {
                    const s = await repo.create({
                      code: code.trim(),
                      nameEn: nameEn.trim(),
                    });
                    setCode("");
                    setNameEn("");
                    setSelectedId(s.id);
                  })
                }
              >
                {t("create")}
              </Button>
            </div>
          </aside>

          <div className="space-y-4 p-4 sm:p-5">
            {!selectedId ? (
              <p className="text-sm text-zinc-500">{t("selectSupplier")}</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-50 p-1">
                  {(
                    [
                      { id: "links" as const, label: t("linksTitle") },
                      {
                        id: "invoices" as const,
                        label: t("invoicesTab"),
                      },
                      {
                        id: "issues" as const,
                        label: t("issuesTab"),
                      },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDetailTab(tab.id)}
                      className={cn(
                        "rounded-lg py-2 text-[13px] font-semibold transition",
                        detailTab === tab.id
                          ? "bg-white text-zinc-950 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-800",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {detailTab === "links" ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-950">
                        {t("linksTitle")}
                      </p>
                      <span className="text-[11px] text-zinc-400">
                        {links.length} {t("links")}
                      </span>
                    </div>

                    {links.length === 0 ? (
                      <p className="text-sm text-zinc-500">{t("linksEmpty")}</p>
                    ) : (
                      <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
                        {links.map((l) => (
                          <li
                            key={l.id}
                            className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-zinc-900">
                                {t(
                                  `linkType.${l.linkType}` as "linkType.package",
                                )}{" "}
                                ·{" "}
                                <span className="font-mono text-[12px] text-zinc-500">
                                  {l.linkId.slice(0, 8)}…
                                </span>
                              </p>
                              <p className="text-[11px] text-zinc-400">
                                {t("allotment")}: {l.sold}/
                                {l.allotment || "∞"} ·{" "}
                                {(l.unitCost / 100).toFixed(0)} {l.currency}
                              </p>
                            </div>
                            <Badge
                              className={
                                l.confirmationStatus === "confirmed"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-amber-50 text-amber-900"
                              }
                            >
                              {t(
                                `confirmStatus.${l.confirmationStatus}` as "confirmStatus.pending",
                              )}
                            </Badge>
                            {l.oversold ? (
                              <Badge className="bg-rose-50 text-rose-800">
                                {t("oversold")}
                              </Badge>
                            ) : null}
                            {l.confirmationStatus === "pending" ? (
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() =>
                                  void run(() =>
                                    repo.confirmLink(l.id, confirmRef),
                                  )
                                }
                              >
                                {t("confirmLink")}
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void run(() =>
                                  repo.deleteLink(selectedId, l.id),
                                )
                              }
                            >
                              {t("remove")}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-zinc-200 p-3">
                      <Select
                        value={linkType}
                        onValueChange={(v) =>
                          setLinkType(v as SupplierLinkType)
                        }
                      >
                        <SelectTrigger className="h-8 w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LINK_TYPES.map((lt) => (
                            <SelectItem key={lt} value={lt}>
                              {t(`linkType.${lt}` as "linkType.package")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="h-8 min-w-[200px] flex-1 font-mono text-[12px]"
                        placeholder={t("linkIdPh")}
                        value={linkId}
                        onChange={(e) => setLinkId(e.target.value)}
                      />
                      <Input
                        className="h-8 w-[80px]"
                        placeholder={t("allotment")}
                        value={allotment}
                        onChange={(e) => setAllotment(e.target.value)}
                      />
                      <Input
                        className="h-8 w-[90px]"
                        placeholder={t("unitCost")}
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                      />
                      <Input
                        className="h-8 w-[120px]"
                        placeholder={t("confirmRefPh")}
                        value={confirmRef}
                        onChange={(e) => setConfirmRef(e.target.value)}
                      />
                      <Button
                        size="sm"
                        disabled={busy || !linkId.trim()}
                        onClick={() =>
                          void run(async () => {
                            await repo.addLink(selectedId, {
                              linkType,
                              linkId: linkId.trim(),
                              allotment: Number(allotment) || 0,
                              unitCost: Math.round(
                                (Number(unitCost) || 0) * 100,
                              ),
                            });
                            setLinkId("");
                          })
                        }
                      >
                        {t("addLink")}
                      </Button>
                    </div>
                  </>
                ) : null}

                {detailTab === "invoices" ? (
                  <SupplierInvoicesPanel
                    supplierId={selectedId}
                    repository={repo}
                  />
                ) : null}

                {detailTab === "issues" ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-zinc-950">
                      {t("issuesTitle")}
                    </p>
                    {issues.length === 0 ? (
                      <p className="text-sm text-zinc-500">{t("issuesEmpty")}</p>
                    ) : (
                      <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
                        {issues.map((iss) => (
                          <li key={iss.id} className="px-3 py-2.5 text-sm">
                            <p className="text-zinc-900">{iss.note}</p>
                            <p className="mt-1 text-[11px] text-zinc-400">
                              {iss.createdByName || iss.createdBy} ·{" "}
                              {iss.createdAt
                                ? new Date(iss.createdAt).toLocaleString()
                                : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Input
                        className="min-w-[180px] flex-1"
                        placeholder={t("issueNotePh")}
                        value={issueNote}
                        onChange={(e) => setIssueNote(e.target.value)}
                      />
                      <Button
                        size="sm"
                        disabled={busy || !issueNote.trim()}
                        onClick={() =>
                          void run(async () => {
                            await repo.createIssue(selectedId, {
                              note: issueNote.trim(),
                            });
                            setIssueNote("");
                            setIssues(await repo.listIssues(selectedId));
                          })
                        }
                      >
                        {t("addIssue")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}
