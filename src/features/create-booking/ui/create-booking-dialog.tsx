"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { BookingRepository } from "@/entities/booking";
import { createCustomerRepository } from "@/entities/customer";
import { createTourPackageRepository } from "@/entities/tourpackage";
import { useCan } from "@/entities/viewer";
import { PackagePicker, pickOf, type PackagePick } from "@/features/package-link";
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
  useMutationFeedback,
} from "@/shared/ui";

type Props = {
  repository: BookingRepository;
  defaultCustomerId?: string;
  defaultDepartureId?: string;
  /** Preselects a package; its soonest bookable departure is suggested. */
  defaultPackageId?: string;
  onCreated?: (bookingId: string) => void;
  /** Replaces the default button. */
  trigger?: React.ReactElement;
};

export function CreateBookingDialog({
  repository,
  defaultCustomerId,
  defaultDepartureId,
  defaultPackageId,
  onCreated,
  trigger,
}: Props) {
  const allowed = useCan("bookings.write");
  const t = useTranslations("bookings");
  const tc = useTranslations("common");
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [pick, setPick] = useState<PackagePick>(() => pickOf(defaultPackageId, defaultDepartureId));
  const departureId = pick.departureId ?? "";
  const [pax, setPax] = useState("2");
  const [busy, setBusy] = useState(false);
  const custRepo = useMemo(() => createCustomerRepository(), []);
  const pkgRepo = useMemo(() => createTourPackageRepository(), []);
  const [customers, setCustomers] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void custRepo.search("").then((list) => {
      if (!alive) return;
      setCustomers(list.slice(0, 40).map((c) => ({ id: c.id, label: c.fullName })));
      setCustomerId((cur) => cur || list[0]?.id || "");
    });
    if (defaultDepartureId && !defaultPackageId) {
      void pkgRepo
        .getDeparture(defaultDepartureId)
        .then((d) => {
          if (alive) setPick(pickOf(d.packageId, d.id));
        })
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
  }, [open, custRepo, pkgRepo, defaultDepartureId, defaultPackageId]);

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
    } catch (err) {
      feedback.error(err, t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button type="button">{t("create")}</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto" data-testid="create-booking-dialog">
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
            <PackagePicker value={pick} onChange={setPick} requireDeparture testId="create-booking-package" />
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
            <Button type="button" disabled={busy || !departureId || !customerId} onClick={() => void submit()} data-testid="create-booking-submit">
              {t("create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
