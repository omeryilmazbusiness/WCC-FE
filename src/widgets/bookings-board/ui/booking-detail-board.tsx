"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  createBookingRepository,
  LINE_KINDS,
  type Booking,
  type BookingChecklistItem,
  type BookingLineItem,
  type BookingParticipant,
  type BookingReadiness,
  type BookingRepository,
} from "@/entities/booking";
import { ConfirmBookingTasksButton } from "@/features/confirm-booking-tasks";
import { formatDateTime } from "@/shared/lib/format";
import { Link } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Screen,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from "@/shared/ui";

type Props = {
  bookingId: string;
  repository?: BookingRepository;
};

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${currency}`;
  }
}

export function BookingDetailBoard({ bookingId, repository }: Props) {
  const repo = repository ?? createBookingRepository();
  const t = useTranslations("bookings");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { push } = useToast();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [participants, setParticipants] = useState<BookingParticipant[]>([]);
  const [lineItems, setLineItems] = useState<BookingLineItem[]>([]);
  const [checklist, setChecklist] = useState<BookingChecklistItem[]>([]);
  const [ready, setReady] = useState<BookingReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  const [paxName, setPaxName] = useState("");
  const [paxPassport, setPaxPassport] = useState("");
  const [draftLines, setDraftLines] = useState<
    { kind: string; label: string; quantity: string; unitPrice: string; unitCost: string }[]
  >([]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [b, p, l, c, r] = await Promise.all([
        repo.getById(bookingId),
        repo.listParticipants(bookingId),
        repo.listLineItems(bookingId),
        repo.listChecklist(bookingId),
        repo.readiness(bookingId),
      ]);
      setBooking(b);
      setParticipants(p);
      setLineItems(l);
      setChecklist(c);
      setReady(r);
      setDraftLines(
        l.length
          ? l.map((x) => ({
              kind: x.kind,
              label: x.label,
              quantity: String(x.quantity),
              unitPrice: String(x.unitPrice / 100),
              unitCost: String(x.unitCost / 100),
            }))
          : [
              {
                kind: "package",
                label: "Package",
                quantity: "1",
                unitPrice: "0",
                unitCost: "0",
              },
            ],
      );
    } catch {
      setError(t("loadError"));
    }
  }, [bookingId, repo, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addParticipant() {
    if (!paxName.trim() || !booking) return;
    try {
      await repo.addParticipant(booking.id, {
        fullName: paxName.trim(),
        passportNo: paxPassport.trim(),
      });
      setPaxName("");
      setPaxPassport("");
      push({ title: t("participantAdded"), tone: "success" });
      await refresh();
    } catch (e) {
      push({
        title: t("saveError"),
        description: e instanceof Error ? e.message : undefined,
        tone: "error",
      });
    }
  }

  async function saveLines() {
    if (!booking) return;
    try {
      const res = await repo.setLineItems(
        booking.id,
        draftLines.map((l) => ({
          kind: l.kind,
          label: l.label || l.kind,
          quantity: Math.max(1, Number(l.quantity) || 1),
          unitPrice: Math.round((Number(l.unitPrice) || 0) * 100),
          unitCost: Math.round((Number(l.unitCost) || 0) * 100),
        })),
      );
      setBooking(res.booking);
      setLineItems(res.items);
      push({ title: t("linesSaved"), tone: "success" });
      await refresh();
    } catch (e) {
      push({
        title: t("saveError"),
        description: e instanceof Error ? e.message : undefined,
        tone: "error",
      });
    }
  }

  async function toggleCheck(item: BookingChecklistItem) {
    try {
      await repo.updateChecklist(bookingId, item.id, !item.completed);
      await refresh();
    } catch {
      push({ title: t("saveError"), tone: "error" });
    }
  }

  async function confirmBooking() {
    if (!booking) return;
    try {
      const updated = await repo.confirm(booking.id);
      setBooking(updated);
      push({ title: t("confirmedTitle"), tone: "success" });
      await refresh();
    } catch (e) {
      push({
        title: t("confirmError"),
        description: e instanceof Error ? e.message : undefined,
        tone: "error",
      });
    }
  }

  if (error) {
    return (
      <Screen>
        <ErrorState title={error} retryLabel={tc("retry")} onRetry={() => void refresh()} />
      </Screen>
    );
  }
  if (!booking) {
    return (
      <Screen>
        <p className="text-sm text-zinc-500">{tc("loading")}</p>
      </Screen>
    );
  }

  const draft = booking.status === "draft";

  return (
    <Screen>
      <PageHeader
        title={t("detailTitle", { id: booking.id.slice(0, 8) })}
        description={t("detailSubtitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={routes.bookings}>{t("backToList")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={routes.customer(booking.customerId)}>{t("openCustomer")}</Link>
            </Button>
            {draft ? (
              <Button
                size="sm"
                disabled={!ready?.can_confirm}
                onClick={() => void confirmBooking()}
              >
                {t("confirm")}
              </Button>
            ) : null}
            {booking.status === "confirmed" ? (
              <ConfirmBookingTasksButton
                bookingId={booking.id}
                label={booking.id.slice(0, 8)}
                customerId={booking.customerId}
              />
            ) : null}
          </div>
        }
      />

      <div className="mb-6 grid gap-3 rounded-[24px] border border-zinc-200/80 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={t("fields.status")}>
          <Badge>{t(`status.${booking.status}`)}</Badge>
        </Metric>
        <Metric label={t("fields.pax")}>{booking.paxCount}</Metric>
        <Metric label={t("fields.total")}>
          {money(booking.totalAmount, booking.currency)}
        </Metric>
        <Metric label={t("fields.margin")}>
          {money(booking.margin, booking.currency)}
        </Metric>
      </div>

      {ready ? (
        <div className="mb-6 rounded-[24px] border border-zinc-200/80 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">{t("readiness")}</p>
          <p className="mt-1 text-sm text-zinc-600">
            {ready.can_confirm ? t("readyToConfirm") : t("notReady")}
          </p>
          {ready.blocking.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-rose-700">
              {ready.blocking.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          {ready.warnings.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-amber-800">
              {ready.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          {ready.risk_alerts.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-zinc-600">
              {ready.risk_alerts.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="participants">{t("tabs.participants")}</TabsTrigger>
          <TabsTrigger value="lines">{t("tabs.lines")}</TabsTrigger>
          <TabsTrigger value="checklist">{t("tabs.checklist")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <dl className="grid grid-cols-1 gap-x-10 gap-y-6 rounded-[24px] border border-zinc-200/80 bg-white p-6 text-sm sm:grid-cols-2">
            <Field label={t("fields.customer")} value={booking.customerId} />
            <Field label={t("fields.departure")} value={booking.departureId} />
            <Field
              label={t("fields.balance")}
              value={money(booking.balanceAmt, booking.currency)}
            />
            <Field
              label={t("fields.cost")}
              value={money(booking.costAmt, booking.currency)}
            />
            <Field
              label={t("fields.updated")}
              value={formatDateTime(booking.updatedAt, locale)}
            />
            <Field label={t("fields.notes")} value={booking.notes || "—"} className="col-span-full" />
          </dl>
        </TabsContent>

        <TabsContent value="participants" className="mt-4 space-y-4">
          {participants.length === 0 ? (
            <EmptyState title={t("participantsEmpty")} />
          ) : (
            <ul className="divide-y divide-zinc-100 rounded-[24px] border border-zinc-200/80 bg-white">
              {participants.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-zinc-950">{p.fullName}</p>
                    <p className="text-zinc-500">
                      {p.passportNo || t("passportMissing")} · {p.nationality || "—"}
                    </p>
                  </div>
                  {draft ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await repo.deleteParticipant(booking.id, p.id);
                        await refresh();
                      }}
                    >
                      {t("remove")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {draft ? (
            <div className="flex flex-wrap gap-2 rounded-[24px] border border-zinc-200/80 bg-white p-4">
              <Input
                placeholder={t("fields.fullName")}
                value={paxName}
                onChange={(e) => setPaxName(e.target.value)}
                className="max-w-xs"
              />
              <Input
                placeholder={t("fields.passport")}
                value={paxPassport}
                onChange={(e) => setPaxPassport(e.target.value)}
                className="max-w-xs"
              />
              <Button type="button" onClick={() => void addParticipant()}>
                {t("addParticipant")}
              </Button>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="lines" className="mt-4 space-y-3">
          {draftLines.map((line, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-[20px] border border-zinc-200/80 bg-white p-4 sm:grid-cols-5"
            >
              <Select
                value={line.kind}
                onValueChange={(v) => {
                  const next = [...draftLines];
                  next[idx] = { ...next[idx], kind: v };
                  setDraftLines(next);
                }}
                disabled={!draft}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(`lineKinds.${k}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={line.label}
                disabled={!draft}
                onChange={(e) => {
                  const next = [...draftLines];
                  next[idx] = { ...next[idx], label: e.target.value };
                  setDraftLines(next);
                }}
                placeholder={t("fields.label")}
              />
              <Input
                value={line.quantity}
                disabled={!draft}
                onChange={(e) => {
                  const next = [...draftLines];
                  next[idx] = { ...next[idx], quantity: e.target.value };
                  setDraftLines(next);
                }}
                placeholder={t("fields.qty")}
              />
              <Input
                value={line.unitPrice}
                disabled={!draft}
                onChange={(e) => {
                  const next = [...draftLines];
                  next[idx] = { ...next[idx], unitPrice: e.target.value };
                  setDraftLines(next);
                }}
                placeholder={t("fields.unitPrice")}
              />
              <Input
                value={line.unitCost}
                disabled={!draft}
                onChange={(e) => {
                  const next = [...draftLines];
                  next[idx] = { ...next[idx], unitCost: e.target.value };
                  setDraftLines(next);
                }}
                placeholder={t("fields.unitCost")}
              />
            </div>
          ))}
          {draft ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDraftLines([
                    ...draftLines,
                    {
                      kind: "extras",
                      label: "",
                      quantity: "1",
                      unitPrice: "0",
                      unitCost: "0",
                    },
                  ])
                }
              >
                {t("addLine")}
              </Button>
              <Button type="button" onClick={() => void saveLines()}>
                {t("saveLines")}
              </Button>
            </div>
          ) : lineItems.length === 0 ? (
            <EmptyState title={t("linesEmpty")} />
          ) : null}
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <ul className="divide-y divide-zinc-100 rounded-[24px] border border-zinc-200/80 bg-white">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-950">{item.label}</p>
                  <p className="text-xs text-zinc-500">
                    {item.required ? t("required") : t("optional")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={item.completed ? "default" : "outline"}
                  onClick={() => void toggleCheck(item)}
                >
                  {item.completed ? t("done") : t("markDone")}
                </Button>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </Screen>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-1.5 text-[15px] font-semibold text-zinc-950">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1.5 text-[15px] font-medium text-zinc-950">{value}</dd>
    </div>
  );
}
