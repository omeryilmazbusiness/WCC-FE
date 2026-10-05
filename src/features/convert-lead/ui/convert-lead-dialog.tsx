"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { conversionPath, type Lead, type LeadRepository } from "@/entities/lead";
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
  useToast,
  useMutationFeedback,
} from "@/shared/ui";

type Props = {
  lead: Lead;
  repository: LeadRepository;
  onConverted: (lead: Lead, bookingId: string) => void;
  /** Custom trigger element (rendered asChild); defaults to a small "Convert" button. */
  trigger?: ReactNode;
};

export function ConvertLeadDialog({ lead, repository, onConverted, trigger }: Props) {
  const allowed = useCan("leads.write");
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<PackagePick>(() => pickOf(lead.interest.packageId));
  const [pax, setPax] = useState(() => String(lead.interest.paxCount || 2));
  const [amount, setAmount] = useState("0");
  const [busy, setBusy] = useState(false);
  const departureId = pick.departureId ?? "";

  if (lead.convertedBookingId) return null;
  if (!conversionPath(lead.stage)) return null;

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
      router.push(routes.booking(res.bookingId));
    } catch (err) {
      feedback.error(err, t("convertError"));
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setPick(pickOf(lead.interest.packageId));
          setPax(String(lead.interest.paxCount || 2));
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" size="sm">
            {t("convert")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto" data-testid="convert-lead-dialog">
        <DialogHeader>
          <DialogTitle>{t("convertTitle")}</DialogTitle>
          <DialogDescription>
            {t("convertHint", { name: lead.fullName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <PackagePicker
            value={pick}
            onChange={setPick}
            requireDeparture
            required={false}
            label={t("fields.departure")}
            testId="convert-lead-package"
          />
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
            <Button type="button" disabled={busy || !departureId} onClick={() => void confirm()} data-testid="convert-lead-submit">
              {t("convert")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
