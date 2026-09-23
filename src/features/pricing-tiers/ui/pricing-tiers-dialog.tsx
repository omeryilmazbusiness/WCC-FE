"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { PricingTier, TierInput, TourPackageRepository } from "@/entities/tourpackage";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@/shared/ui";

type Row = TierInput & { key: string };

type Props = {
  packageId: string;
  repository: TourPackageRepository;
  onSaved?: () => void;
};

export function PricingTiersDialog({ packageId, repository, onSaved }: Props) {
  const t = useTranslations("packages");
  const tc = useTranslations("common");
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void repository.listPackageTiers(packageId).then((tiers: PricingTier[]) => {
      setRows(
        tiers.map((x) => ({
          key: x.id,
          code: x.code,
          label: x.label,
          kind: x.kind,
          amount: x.amount / 100,
          currency: x.currency,
          isActive: x.isActive,
        })),
      );
    });
  }, [open, packageId, repository]);

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        code: "",
        label: "",
        kind: "room",
        amount: 0,
        currency: "USD",
        isActive: true,
      },
    ]);
  }

  async function save() {
    setBusy(true);
    try {
      await repository.setPackageTiers(
        packageId,
        rows
          .filter((r) => r.code.trim())
          .map((r) => ({
            code: r.code.trim(),
            label: r.label.trim(),
            kind: r.kind,
            amount: Math.round(Number(r.amount) * 100),
            currency: r.currency || "USD",
            isActive: r.isActive ?? true,
          })),
      );
      push({ title: t("tiersSaved"), tone: "success" });
      onSaved?.();
      setOpen(false);
    } catch {
      push({ title: t("tiersError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          {t("pricingTiers")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("pricingTiers")}</DialogTitle>
          <DialogDescription>{t("pricingTiersHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div
              key={row.key}
              className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200/80 p-3"
            >
              <Input
                placeholder={t("tierCode")}
                value={row.code}
                onChange={(e) => {
                  const v = e.target.value;
                  setRows((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, code: v } : r)),
                  );
                }}
              />
              <Input
                placeholder={t("tierLabel")}
                value={row.label}
                onChange={(e) => {
                  const v = e.target.value;
                  setRows((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, label: v } : r)),
                  );
                }}
              />
              <Select
                value={row.kind}
                onValueChange={(v) =>
                  setRows((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, kind: v } : r)),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">{t("tierKinds.room")}</SelectItem>
                  <SelectItem value="occupancy">{t("tierKinds.occupancy")}</SelectItem>
                  <SelectItem value="age">{t("tierKinds.age")}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder={t("tierAmount")}
                value={String(row.amount)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRows((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, amount: v } : r)),
                  );
                }}
              />
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addRow}>
            {t("addTier")}
          </Button>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {tc("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
