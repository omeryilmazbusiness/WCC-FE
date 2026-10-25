"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2, BusFront, Check, Pencil, Plane, Plus, Stamp, Ticket, Trash2, UserRound, UserRoundPlus } from "lucide-react";
import {
  CHANNEL_LOOK,
  GENDERS,
  SALES_CHANNELS,
  SERVICE_LOOK,
  SERVICE_TYPES,
  SUPPLIER_SOURCES,
  type SalesChannel,
  type ServiceType,
} from "@/entities/booking";
import { createCustomerRepository } from "@/entities/customer";
import { useCan } from "@/entities/viewer";
import { CustomerFormDialog } from "@/features/customer-form";
import { PackagePicker, pickOf, type PackagePick } from "@/features/package-link";
import { applyBusRide, busRideLabel, removeBusRide, type BusRide } from "../model/bus-ride";
import { applyCustomer } from "../model/party";
import { applyFlightPick, flightPickFromOffer, flightSummary } from "../model/flight-pick";
import { formatMoney } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import {
  Button,
  ChipSet,
  ChoiceGrid,
  Field,
  FormSection,
  GlyphTile,
  IconInput,
  InitialsAvatar,
  Input,
  MoneyInput,
  SearchField,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stepper,
  SwitchRow,
  Textarea,
} from "@/shared/ui";
import {
  BOOKING_CURRENCIES,
  BOOKING_SERVICE_KINDS,
  draftDiscount,
  draftGrandTotal,
  draftLineTotal,
  draftSubtotal,
  emptyService,
  moneyMinor,
  emptyTraveller,
  serviceLineLabel,
  type BookingCreateStep,
  type BookingDraft,
  type BookingServiceKind,
  type DraftIssues,
  type ServiceDraft,
  type TravellerDraft,
} from "../model/draft";
import { BusRideDialog } from "./bus-ride-dialog";
import { KIND_LOOK, STEP_LOOK } from "./look";
import { PickFlightDialog } from "./pick-flight-dialog";

type CustomerOpt = { id: string; label: string };
type Patch = (next: Partial<BookingDraft>) => void;

export function BookingCreateStepBody({
  step,
  draft,
  issues,
  customers,
  customerQuery,
  onCustomerQuery,
  onPatch,
  canDiscount,
  onCustomerCreated,
}: {
  step: BookingCreateStep;
  draft: BookingDraft;
  issues: DraftIssues;
  customers: CustomerOpt[];
  customerQuery: string;
  onCustomerQuery: (q: string) => void;
  onPatch: Patch;
  canDiscount: boolean;
  onCustomerCreated: (customer: { id: string; fullName: string; nationality?: string; dateOfBirth?: string | null }) => void;
}) {
  switch (step) {
    case "party":
      return (
        <PartyStep
          draft={draft}
          issues={issues.party ?? []}
          customers={customers}
          customerQuery={customerQuery}
          onCustomerQuery={onCustomerQuery}
          onPatch={onPatch}
          onCustomerCreated={onCustomerCreated}
        />
      );
    case "trip":
      return <TripStep draft={draft} issues={issues.trip ?? []} onPatch={onPatch} />;
    case "travellers":
      return <TravellersStep draft={draft} issues={issues.travellers ?? []} onPatch={onPatch} />;
    case "services":
      return <ServicesStep draft={draft} issues={issues.services ?? []} onPatch={onPatch} canDiscount={canDiscount} />;
    case "review":
      return <ReviewStep draft={draft} />;
  }
}

function StepShell({ step, children }: { step: BookingCreateStep; children: ReactNode }) {
  const t = useTranslations("bookings.steps");
  const look = STEP_LOOK[step];
  return (
    <FormSection icon={look.icon} tone={look.tone} title={t(`${step}.title`)} hint={t(`${step}.hint`)}>
      {children}
    </FormSection>
  );
}

function PartyStep({
  draft,
  issues,
  customers,
  customerQuery,
  onCustomerQuery,
  onPatch,
  onCustomerCreated,
}: {
  draft: BookingDraft;
  issues: string[];
  customers: CustomerOpt[];
  customerQuery: string;
  onCustomerQuery: (q: string) => void;
  onPatch: Patch;
  onCustomerCreated: (customer: { id: string; fullName: string; nationality?: string; dateOfBirth?: string | null }) => void;
}) {
  const t = useTranslations("bookings.form");
  const tw = useTranslations("bookingWorkspace");
  const canCreate = useCan("customers.write");
  const [creating, setCreating] = useState(false);
  const [custRepo] = useState(createCustomerRepository);
  const filtered = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.label.toLowerCase().includes(q));
  }, [customers, customerQuery]);

  return (
    <StepShell step="party">
        <Field label={t("customer")}>
          <p className="-mt-0.5 text-[12px] leading-snug text-zinc-400">{t("customerHint")}</p>
          <div className="flex items-stretch gap-2">
            <SearchField
              value={customerQuery}
              onValueChange={onCustomerQuery}
              placeholder={t("searchCustomer")}
              containerClassName="max-w-none min-w-0 flex-1"
              className="h-12"
              data-testid="create-booking-customer-search"
            />
            {canCreate ? (
              <Button type="button" variant="outline" className="h-12 shrink-0 gap-1.5 px-3 sm:px-4" aria-label={t("createCustomer")} data-testid="create-booking-new-customer" onClick={() => setCreating(true)}>
                <UserRoundPlus className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t("createCustomer")}</span>
              </Button>
            ) : null}
          </div>
          <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-[20px] bg-zinc-50/80 p-1.5 ring-1 ring-zinc-200/70">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <GlyphTile icon={UserRoundPlus} tone="violet" size="section" />
                <p className="mt-3 text-[13.5px] font-semibold text-zinc-700">{t("noCustomers")}</p>
                <p className="mt-1 max-w-sm text-[12.5px] leading-snug text-zinc-400">{t("noCustomersCreate")}</p>
                {canCreate ? (
                  <Button type="button" className="mt-4 h-11 gap-1.5" data-testid="create-booking-new-customer-empty" onClick={() => setCreating(true)}>
                    <UserRoundPlus className="h-4 w-4" aria-hidden />
                    {t("createCustomer")}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {filtered.map((c) => {
              const active = c.id === draft.customerId;
              return (
                <button
                  key={c.id}
                  type="button"
                  data-testid={`create-booking-customer-${c.id}`}
                  onClick={() => onPatch(applyCustomer(draft, { id: c.id, fullName: c.label }))}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[16px] px-2.5 py-2 text-start transition",
                    active ? "bg-white shadow-[0_8px_20px_-16px_rgba(15,23,42,0.45)] ring-1 ring-zinc-900/10" : "hover:bg-white/80",
                  )}
                >
                  <InitialsAvatar id={c.id} name={c.label} size="md" />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-none text-zinc-900">{c.label}</span>
                  {active ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white" aria-hidden>
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {issues.includes("customer") ? <FieldIssue>{t("customerRequired")}</FieldIssue> : null}
          <CustomerFormDialog
            repository={custRepo}
            open={creating}
            onOpenChange={setCreating}
            onSaved={(res) => {
              onCustomerCreated(res.customer);
              onPatch(applyCustomer(draft, res.customer));
            }}
          />
        </Field>

        <Field label={t("channel")}>
          <ChoiceGrid
            name="create-booking-channel"
            size="lg"
            columns={2}
            value={draft.channel}
            onChange={(channel: SalesChannel) => onPatch({ channel })}
            options={SALES_CHANNELS.map((ch) => ({
              value: ch,
              label: tw(`channel.${ch}`),
              icon: CHANNEL_LOOK[ch].icon,
              tone: CHANNEL_LOOK[ch].tone,
            }))}
          />
        </Field>

        {draft.channel === "b2b_agency" ? (
          <Field label={t("companyName")} hint={t("companyHint")}>
            <IconInput
              icon={Building2}
              value={draft.companyName}
              onChange={(e) => onPatch({ companyName: e.target.value })}
              data-testid="create-booking-company"
            />
          </Field>
        ) : null}

        <Field label={t("notes")}>
          <Textarea
            value={draft.notes}
            onChange={(e) => onPatch({ notes: e.target.value })}
            placeholder={t("notesPh")}
            rows={3}
            data-testid="create-booking-notes"
          />
        </Field>
    </StepShell>
  );
}

function TripStep({ draft, issues, onPatch }: { draft: BookingDraft; issues: string[]; onPatch: Patch }) {
  const t = useTranslations("bookings.form");
  const tw = useTranslations("bookingWorkspace");
  const locale = useLocale();
  const canSearchFlights = useCan("flights.search");
  const [flightOpen, setFlightOpen] = useState(false);
  const [busOpen, setBusOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<BusRide | null>(null);
  const pick: PackagePick = pickOf(draft.packageId || null, draft.departureId || null);
  const adults = Math.max(1, draft.travellers.filter((p) => p.fullName.trim()).length);

  function openNewBus() {
    setEditingBus(null);
    setBusOpen(true);
  }

  return (
    <StepShell step="trip">
      <Field label={t("serviceType")}>
        <ChoiceGrid
          name="create-booking-service-type"
          size="lg"
          columns={3}
          value={draft.serviceType}
          onChange={(serviceType: ServiceType) => {
            const onlyDefault =
              draft.services.length === 1 && !draft.services[0].label.trim() && draft.services[0].kind === "package";
            onPatch({
              serviceType,
              flight: serviceType === "flight" ? draft.flight : null,
              services: onlyDefault && BOOKING_SERVICE_KINDS.includes(serviceType as BookingServiceKind)
                ? [{ ...draft.services[0], kind: serviceType as BookingServiceKind }]
                : draft.services,
            });
            if (serviceType === "flight" && canSearchFlights) setFlightOpen(true);
            if (serviceType === "bus" && draft.buses.length === 0) openNewBus();
          }}
          options={SERVICE_TYPES.map((s) => ({
            value: s,
            label: tw(`service.${s}`),
            icon: SERVICE_LOOK[s].icon,
            tone: SERVICE_LOOK[s].tone,
          }))}
        />
      </Field>

      {draft.serviceType === "flight" ? (
        <Field label={t("pickFlight")} hint={t("pickFlightHint")}>
          {draft.flight ? (
            <div className="flex flex-col gap-3 rounded-[22px] bg-sky-50/70 px-3.5 py-3 ring-1 ring-sky-100 sm:flex-row sm:items-center" data-testid="create-booking-flight-picked">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <GlyphTile icon={Plane} tone="sky" size="section" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold leading-tight text-zinc-950">{flightSummary(draft.flight)}</p>
                  <p className="mt-1 truncate text-[12.5px] font-medium text-zinc-500">{draft.flight.airlineName || draft.flight.airline}</p>
                </div>
              </div>
              {canSearchFlights ? (
                <Button type="button" variant="outline" className="h-11 shrink-0" data-testid="create-booking-change-flight" onClick={() => setFlightOpen(true)}>
                  {t("changeFlight")}
                </Button>
              ) : null}
            </div>
          ) : (
            <Button type="button" className="h-12 w-full gap-2 rounded-[18px]" data-testid="create-booking-pick-flight" onClick={() => setFlightOpen(true)} disabled={!canSearchFlights}>
              <Plane className="h-5 w-5" aria-hidden />
              {t("pickFlight")}
            </Button>
          )}
          {issues.includes("flight") ? <FieldIssue>{t("flightRequired")}</FieldIssue> : null}
          <PickFlightDialog
            open={flightOpen}
            onOpenChange={setFlightOpen}
            currency={draft.currency}
            adults={adults}
            onPicked={(offer) => onPatch(applyFlightPick(draft, flightPickFromOffer(offer)))}
          />
        </Field>
      ) : null}

      {draft.serviceType === "bus" ? (
        <Field label={t("busList")} hint={t("busHint")}>
          {draft.buses.length === 0 ? (
            <div className="flex flex-col items-center rounded-[22px] bg-amber-50/60 px-4 py-8 text-center ring-1 ring-amber-100">
              <GlyphTile icon={BusFront} tone="amber" size="section" />
              <p className="mt-3 text-[13.5px] font-semibold text-zinc-700">{t("busEmpty")}</p>
              <Button type="button" className="mt-4 h-11 gap-1.5" data-testid="create-booking-add-bus" onClick={openNewBus}>
                <Plus className="h-4 w-4" aria-hidden />
                {t("addBus")}
              </Button>
            </div>
          ) : (
            <ol className="space-y-2" data-testid="create-booking-bus-list">
              {draft.buses.map((ride) => (
                <li
                  key={ride.key}
                  className="flex flex-col gap-3 rounded-[20px] bg-amber-50/70 px-3.5 py-3 ring-1 ring-amber-100 sm:flex-row sm:items-center"
                  data-testid={`create-booking-bus-${ride.key}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <GlyphTile icon={BusFront} tone="amber" size="section" />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold leading-tight text-zinc-950">{busRideLabel(ride)}</p>
                      <p className="mt-1 truncate text-[12.5px] font-medium text-zinc-500">
                        {[
                          ride.vehicleClass === "vip" ? t("busClassVip") : ride.vehicleClass === "sleeper" ? t("busClassSleeper") : t("busClassStandard"),
                          ride.plateNo,
                          formatMoney((moneyMinor(ride.unitPrice) ?? 0) * Math.max(1, ride.seats), locale, draft.currency),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      data-testid="create-booking-edit-bus"
                      onClick={() => {
                        setEditingBus(ride);
                        setBusOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                      {t("editBus")}
                    </Button>
                    <Button type="button" variant="ghost" className="h-11 px-2.5 text-rose-600" onClick={() => onPatch(removeBusRide(draft, ride.key))}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                      {t("removeBus")}
                    </Button>
                  </div>
                </li>
              ))}
              <Button type="button" variant="outline" className="h-12 w-full gap-2 rounded-[18px]" data-testid="create-booking-add-bus" onClick={openNewBus}>
                <Plus className="h-5 w-5" aria-hidden />
                {t("addBus")}
              </Button>
            </ol>
          )}
          {issues.includes("bus") ? <FieldIssue>{t("busRequired")}</FieldIssue> : null}
          <BusRideDialog
            open={busOpen}
            onOpenChange={(open) => {
              setBusOpen(open);
              if (!open) setEditingBus(null);
            }}
            currency={draft.currency}
            adults={adults}
            initial={editingBus}
            onSaved={(ride) => onPatch(applyBusRide(draft, ride))}
          />
        </Field>
      ) : null}

      <Field label={t("departure")} hint={t("departureHint")}>
        <PackagePicker
          value={pick}
          onChange={(next) => onPatch({ packageId: next.packageId ?? "", departureId: next.departureId ?? "" })}
          requireDeparture
          required
          customerId={draft.customerId || null}
          testId="create-booking-package"
        />
        {issues.includes("departure") ? <FieldIssue>{t("departureRequired")}</FieldIssue> : null}
      </Field>

      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Field label={t("supplier")}>
          <Select
            value={draft.supplierSource || "none"}
            onValueChange={(v) => onPatch({ supplierSource: v === "none" ? "" : (v as BookingDraft["supplierSource"]) })}
          >
            <SelectTrigger className="h-12" data-testid="create-booking-supplier">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{tw("supplier.none")}</SelectItem>
              {SUPPLIER_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {tw(`supplier.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("pnr")} hint={t("pnrHint")}>
          <IconInput
            icon={Ticket}
            value={draft.pnr}
            onChange={(e) => onPatch({ pnr: e.target.value.toUpperCase() })}
            placeholder="ABC12D"
            data-testid="create-booking-pnr"
          />
        </Field>
      </div>

      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Field label={t("currency")}>
          <Select value={draft.currency} onValueChange={(currency) => onPatch({ currency })}>
            <SelectTrigger className="h-12" data-testid="create-booking-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOOKING_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("summary")}>
          <Input
            className="h-12"
            value={draft.summary}
            onChange={(e) => onPatch({ summary: e.target.value })}
            placeholder={t("summaryPh")}
            data-testid="create-booking-summary"
          />
        </Field>
      </div>
    </StepShell>
  );
}

function TravellersStep({ draft, issues, onPatch }: { draft: BookingDraft; issues: string[]; onPatch: Patch }) {
  const t = useTranslations("bookings.form");
  const tp = useTranslations("bookingWorkspace.pax");

  function setTraveller(i: number, patch: Partial<TravellerDraft>) {
    onPatch({ travellers: draft.travellers.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  }

  return (
    <div className="space-y-4">
      {draft.travellers.map((p, i) => (
        <section key={p.key} className="rounded-[26px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5" data-testid={`create-booking-traveller-${i}`}>
          <header className="mb-4 flex items-start gap-3 sm:items-center">
            <GlyphTile icon={UserRound} tone="amber" size="section" />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold leading-tight tracking-tight text-zinc-950">{t("travellerN", { n: i + 1 })}</p>
              <p className="mt-1 truncate text-[12.5px] font-medium text-zinc-500">{p.fullName.trim() || tp("fullName")}</p>
            </div>
            {draft.travellers.length > 1 ? (
              <Button type="button" variant="ghost" className="h-10 shrink-0 px-2.5 text-rose-600" onClick={() => onPatch({ travellers: draft.travellers.filter((x) => x.key !== p.key) })}>
                <Trash2 className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t("removeTraveller")}</span>
              </Button>
            ) : null}
          </header>
          <div className="space-y-4">
            <Field label={tp("fullName")}>
              <Input className="h-12" value={p.fullName} onChange={(e) => setTraveller(i, { fullName: e.target.value })} data-testid={`create-booking-pax-name-${i}`} />
              {issues.includes(`name:${i}`) ? <FieldIssue>{t("nameRequired")}</FieldIssue> : null}
            </Field>
            <Field label={tp("gender")}>
              <SegmentedControl
                className="flex w-full [&>button]:flex-1 [&>button]:justify-center"
                value={p.gender || "unspecified"}
                onChange={(v) => setTraveller(i, { gender: v === "unspecified" ? "" : (v as TravellerDraft["gender"]) })}
                options={[
                  { value: "unspecified", label: tp("unspecified") },
                  ...GENDERS.map((g) => ({ value: g, label: tp(g) })),
                ]}
              />
            </Field>
            <div className="grid items-start gap-3 sm:grid-cols-2">
              <Field label={tp("dob")}>
                <Input className="h-12" type="date" value={p.dateOfBirth} onChange={(e) => setTraveller(i, { dateOfBirth: e.target.value })} />
              </Field>
              <Field label={tp("nationality")}>
                <Input className="h-12" value={p.nationality} onChange={(e) => setTraveller(i, { nationality: e.target.value.toUpperCase() })} placeholder="SA" />
              </Field>
            </div>
            <div className="grid items-start gap-3 sm:grid-cols-2">
              <Field label={tp("passport")}>
                <Input className="h-12" value={p.passportNo} onChange={(e) => setTraveller(i, { passportNo: e.target.value.toUpperCase() })} />
              </Field>
              <Field label={tp("nationalId")}>
                <Input className="h-12" value={p.nationalId} onChange={(e) => setTraveller(i, { nationalId: e.target.value })} />
                {issues.includes(`nationalId:${i}`) ? <FieldIssue>{t("nationalIdInvalid")}</FieldIssue> : null}
              </Field>
            </div>
            <SwitchRow icon={Stamp} tone="emerald" label={tp("health")} checked={p.healthOk} onChange={(healthOk) => setTraveller(i, { healthOk })} />
          </div>
        </section>
      ))}
      <Button type="button" variant="outline" className="h-12 w-full gap-2 rounded-[18px]" onClick={() => onPatch({ travellers: [...draft.travellers, emptyTraveller()] })} data-testid="create-booking-add-traveller">
        <Plus className="h-5 w-5" aria-hidden />
        {t("addTraveller")}
      </Button>
    </div>
  );
}

function ServicesStep({
  draft,
  issues,
  onPatch,
  canDiscount,
}: {
  draft: BookingDraft;
  issues: string[];
  onPatch: Patch;
  canDiscount: boolean;
}) {
  const t = useTranslations("bookings.form");
  const locale = useLocale();
  const named = draft.travellers.filter((p) => p.fullName.trim());

  function setService(i: number, patch: Partial<ServiceDraft>) {
    onPatch({ services: draft.services.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  }

  return (
    <div className="space-y-4">
      {draft.services.map((svc, i) => {
        const look = KIND_LOOK[svc.kind];
        return (
          <section key={svc.key} className="rounded-[26px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5" data-testid={`create-booking-service-${i}`}>
            <header className="mb-4 flex items-start gap-3 sm:items-center">
              <GlyphTile icon={look.icon} tone={look.tone} size="section" />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold leading-tight tracking-tight text-zinc-950">{t("serviceN", { n: i + 1 })}</p>
                <p className="mt-1 truncate text-[12.5px] font-medium text-zinc-500">{svc.label.trim() || t(`kinds.${svc.kind}`)}</p>
              </div>
              {draft.services.length > 1 ? (
                <Button type="button" variant="ghost" className="h-10 shrink-0 px-2.5 text-rose-600" onClick={() => onPatch({ services: draft.services.filter((x) => x.key !== svc.key) })}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{t("removeService")}</span>
                </Button>
              ) : null}
            </header>
            <div className="space-y-4">
              <Field label={t("kind")}>
                <ChoiceGrid
                  name={`create-booking-kind-${i}`}
                  size="lg"
                  columns={3}
                  value={svc.kind}
                  onChange={(kind: BookingServiceKind) => setService(i, { kind })}
                  options={BOOKING_SERVICE_KINDS.map((k) => ({
                    value: k,
                    label: t(`kinds.${k}`),
                    icon: KIND_LOOK[k].icon,
                    tone: KIND_LOOK[k].tone,
                  }))}
                />
              </Field>
              <Field label={t("serviceLabel")} hint={t("serviceLabelHint")}>
                <Input
                  className="h-12"
                  value={svc.label}
                  onChange={(e) => setService(i, { label: e.target.value })}
                  placeholder={t("serviceLabelPh")}
                  data-testid={`create-booking-svc-label-${i}`}
                />
              </Field>
              <Field label={t("forWhom")} hint={named.length ? t("forWhomHint") : t("forEveryone")}>
                {named.length ? (
                  <ChipSet
                    name={`create-booking-svc-pax-${i}`}
                    values={svc.travellerKeys}
                    onChange={(travellerKeys) => setService(i, { travellerKeys })}
                    options={named.map((p) => ({ value: p.key, label: p.fullName.trim() }))}
                  />
                ) : (
                  <p className="text-[12.5px] text-zinc-500">{t("nameTravellersFirst")}</p>
                )}
              </Field>
              <div className="grid items-start gap-3 sm:grid-cols-3">
                <Field label={t("qty")}>
                  <Stepper value={svc.quantity} onChange={(quantity) => setService(i, { quantity })} min={1} max={40} label={t("qty")} />
                </Field>
                <Field label={t("unitPrice")}>
                  <MoneyInput currency={draft.currency} value={svc.unitPrice} onChange={(unitPrice) => setService(i, { unitPrice })} />
                </Field>
                <Field label={t("unitCost")}>
                  <MoneyInput currency={draft.currency} value={svc.unitCost} onChange={(unitCost) => setService(i, { unitCost })} />
                </Field>
              </div>
              {issues.includes(`money:${i}`) ? <FieldIssue>{t("moneyInvalid")}</FieldIssue> : null}
              <div className="flex items-center justify-end rounded-[16px] bg-zinc-50 px-3.5 py-2.5">
                <span className="text-[15px] font-semibold tabular-nums leading-none text-zinc-900">
                  {formatMoney(draftLineTotal(svc), locale, draft.currency)}
                </span>
              </div>
            </div>
          </section>
        );
      })}
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full gap-2 rounded-[18px]"
        onClick={() => onPatch({ services: [...draft.services, emptyService(draft.serviceType as BookingServiceKind)] })}
        data-testid="create-booking-add-service"
      >
        <Plus className="h-5 w-5" aria-hidden />
        {t("addService")}
      </Button>
      {canDiscount ? (
        <FormSection icon={STEP_LOOK.services.icon} tone="emerald" title={t("discount")}>
          <MoneyInput
            currency={draft.currency}
            value={draft.discountAmt}
            onChange={(discountAmt) => onPatch({ discountAmt })}
            data-testid="create-booking-discount"
          />
          {issues.includes("discount") ? <FieldIssue>{t("discountInvalid")}</FieldIssue> : null}
        </FormSection>
      ) : null}
      <div className="flex items-center justify-between gap-3 rounded-[22px] bg-zinc-950 px-5 py-4 text-white shadow-[0_16px_32px_-20px_rgba(15,23,42,0.7)]">
        <span className="text-[13.5px] font-medium text-zinc-300">{t("grand")}</span>
        <span className="text-[20px] font-semibold tabular-nums leading-none">{formatMoney(draftGrandTotal(draft), locale, draft.currency)}</span>
      </div>
    </div>
  );
}

function ReviewStep({ draft }: { draft: BookingDraft }) {
  const t = useTranslations("bookings.form");
  const tw = useTranslations("bookingWorkspace");
  const tp = useTranslations("bookingWorkspace.pax");
  const locale = useLocale();
  const named = draft.travellers.filter((p) => p.fullName.trim());

  return (
    <div className="space-y-4">
      <FormSection icon={STEP_LOOK.party.icon} tone={STEP_LOOK.party.tone} title={t("reviewParty")}>
        <ReviewRow label={t("customer")} value={draft.customerLabel || t("reviewEmpty")} />
        <ReviewRow label={t("channel")} value={tw(`channel.${draft.channel}`)} />
        {draft.companyName ? <ReviewRow label={t("companyName")} value={draft.companyName} /> : null}
        {draft.notes ? <ReviewRow label={t("notes")} value={draft.notes} /> : null}
      </FormSection>
      <FormSection icon={STEP_LOOK.trip.icon} tone={STEP_LOOK.trip.tone} title={t("reviewTrip")}>
        <ReviewRow label={t("serviceType")} value={tw(`service.${draft.serviceType}`)} />
        {draft.flight ? <ReviewRow label={t("pickFlight")} value={flightSummary(draft.flight)} /> : null}
        {draft.buses.map((ride) => (
          <ReviewRow key={ride.key} label={t("addBus")} value={busRideLabel(ride)} />
        ))}
        <ReviewRow label={t("summary")} value={draft.summary || t("reviewEmpty")} />
        <ReviewRow label={t("pnr")} value={draft.pnr || t("reviewEmpty")} />
        <ReviewRow label={t("supplier")} value={draft.supplierSource ? tw(`supplier.${draft.supplierSource}`) : tw("supplier.none")} />
      </FormSection>
      <FormSection icon={STEP_LOOK.travellers.icon} tone={STEP_LOOK.travellers.tone} title={t("reviewTravellers")}>
        {named.length === 0 ? <p className="text-[13px] text-zinc-500">{t("reviewEmpty")}</p> : null}
        {named.map((p) => (
          <div key={p.key} className="flex items-center gap-3">
            <InitialsAvatar id={p.key} name={p.fullName} size="md" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold leading-tight text-zinc-900">{p.fullName}</p>
              <p className="mt-0.5 truncate text-[12.5px] text-zinc-500">
                {[p.gender === "male" || p.gender === "female" ? tp(p.gender) : null, p.nationality, p.passportNo]
                  .filter(Boolean)
                  .join(" · ") || t("reviewEmpty")}
              </p>
            </div>
          </div>
        ))}
      </FormSection>
      <FormSection icon={STEP_LOOK.services.icon} tone={STEP_LOOK.services.tone} title={t("reviewServices")}>
        {draft.services.map((svc) => {
          const look = KIND_LOOK[svc.kind];
          return (
            <div key={svc.key} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <GlyphTile icon={look.icon} tone={look.tone} size="md" />
                <span className="min-w-0 text-[14px] font-semibold leading-tight text-zinc-900">
                  <span className="block truncate">{serviceLineLabel(svc, named)}</span>
                  <span className="mt-0.5 block font-normal text-zinc-500">
                    {t(`kinds.${svc.kind}`)} · ×{svc.quantity}
                  </span>
                </span>
              </div>
              <span className="shrink-0 text-[14px] font-semibold tabular-nums leading-none">{formatMoney(draftLineTotal(svc), locale, draft.currency)}</span>
            </div>
          );
        })}
        <div className="mt-1 flex justify-between border-t border-zinc-100 pt-3 text-[13.5px]">
          <span className="text-zinc-500">{t("subtotal")}</span>
          <span className="tabular-nums">{formatMoney(draftSubtotal(draft), locale, draft.currency)}</span>
        </div>
        {draftDiscount(draft) > 0 ? (
          <div className="flex justify-between text-[13.5px]">
            <span className="text-zinc-500">{t("discount")}</span>
            <span className="tabular-nums">−{formatMoney(draftDiscount(draft), locale, draft.currency)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-[16px] font-semibold">
          <span>{t("grand")}</span>
          <span className="tabular-nums">{formatMoney(draftGrandTotal(draft), locale, draft.currency)}</span>
        </div>
      </FormSection>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] items-start gap-3 text-[14px]">
      <span className="pt-0.5 text-zinc-500">{label}</span>
      <span className="text-end font-semibold leading-snug text-zinc-900">{value}</span>
    </div>
  );
}

function FieldIssue({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-[12px] font-medium leading-snug text-rose-600">{children}</p>;
}
