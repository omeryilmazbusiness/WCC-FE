"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { BookingRepository } from "@/entities/booking";
import { createCustomerRepository } from "@/entities/customer";
import { createTourPackageRepository } from "@/entities/tourpackage";
import { useRouter } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
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
  repository: BookingRepository;
  defaultCustomerId?: string;
  defaultDepartureId?: string;
  onCreated?: (bookingId: string) => void;
};

export function CreateBookingDialog({
  repository,
  defaultCustomerId,
  defaultDepartureId,
  onCreated,
}: Props) {
  const t = useTranslations("bookings");
  const tc = useTranslations("common");
  const { push } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [departureId, setDepartureId] = useState(defaultDepartureId ?? "");
  const [pax, setPax] = useState("2");
  const [busy, setBusy] = useState(false);
  const custRepo = useMemo(() => createCustomerRepository(), []);
  const pkgRepo = useMemo(() => createTourPackageRepository(), []);
  const [customers, setCustomers] = useState<{ id: string; label: string }[]>([]);
  const [deps, setDeps] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const list = await custRepo.search("");
      setCustomers(list.slice(0, 40).map((c) => ({ id: c.id, label: c.fullName })));
      if (!customerId && list[0]) setCustomerId(list[0].id);
      const packages = await pkgRepo.listPackages();
      const rows: { id: string; label: string }[] = [];
      for (const p of packages) {
        const dlist = await pkgRepo.listDepartures(p.id);
        for (const d of dlist) {
          rows.push({ id: d.id, label: `${p.code} · ${d.code} · ${d.departDate}` });
        }
      }
      setDeps(rows);
      if (!departureId && rows[0]) setDepartureId(rows[0].id);
    })();
  }, [open, custRepo, pkgRepo, customerId, departureId]);

  async function submit() {
    if (!customerId || !departureId) return;
    setBusy(true);
    try {
      const b = await repository.create({
        customerId,
        departureId,
        paxCount: Number(pax) || 1,
      });
      push({ title: t("createdTitle"), tone: "success" });
      setOpen(false);
      onCreated?.(b.id);
      router.push(routes.booking(b.id));
    } catch (e) {
      push({
        title: t("saveError"),
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
        <Button type="button">{t("create")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("fields.customer")}
            </p>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="button" disabled={busy} onClick={() => void submit()}>
              {t("create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
