"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Lead, LeadRepository } from "@/entities/lead";
import { MemoryTourPackageRepository } from "@/entities/tourpackage";
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

type Props = {
  lead: Lead;
  repository: LeadRepository;
  onConverted: (lead: Lead, bookingId: string) => void;
};

export function ConvertLeadDialog({ lead, repository, onConverted }: Props) {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [departureId, setDepartureId] = useState("");
  const [pax, setPax] = useState("2");
  const [amount, setAmount] = useState("0");
  const [busy, setBusy] = useState(false);
  const pkgRepo = useMemo(() => new MemoryTourPackageRepository(), []);
  const [deps, setDeps] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const packages = await pkgRepo.listPackages();
      const rows: { id: string; label: string }[] = [];
      for (const p of packages) {
        const list = await pkgRepo.listDepartures(p.id);
        for (const d of list) {
          rows.push({
            id: d.id,
            label: `${p.code} · ${d.code} · ${d.departDate}`,
          });
        }
      }
      setDeps(rows);
      if (rows[0]) setDepartureId(rows[0].id);
    })();
  }, [open, pkgRepo]);

  if (lead.convertedBookingId) return null;
  if (lead.stage === "lost") return null;

  async function confirm() {
    if (!departureId) return;
    if (!lead.customerId) {
      push({ title: t("convertNeedsCustomer"), tone: "error" });
      return;
    }
    setBusy(true);
    try {
      const res = await repository.convert(lead.id, {
        departureId,
        paxCount: Number(pax) || 1,
        totalAmount: Math.round(Number(amount) || 0),
        currency: "USD",
      });
      onConverted(res.lead, res.bookingId);
      push({
        title: t("convertedTitle"),
        description: t("convertedBody"),
        tone: "success",
      });
      setOpen(false);
    } catch (e) {
      push({
        title: t("convertError"),
        description: e instanceof Error ? e.message : undefined,
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          {t("convert")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("convertTitle")}</DialogTitle>
          <DialogDescription>
            {t("convertHint", { name: lead.fullName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("fields.departure")}
            </p>
            <Select value={departureId} onValueChange={setDepartureId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {deps.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("fields.pax")}
            </p>
            <Input value={pax} onChange={(e) => setPax(e.target.value)} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("fields.amount")}
            </p>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="button" disabled={busy} onClick={() => void confirm()}>
              {t("convert")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
