/**
 * Self-test for linking catalogue packages across the CRM: the package picker rules,
 * task package links on the wire, task drafts opened from a lead or package, and the
 * linked-work summary on the package page.
 * Run: npm run test:package-links
 */
import assert from "node:assert/strict";
import type { Departure, TourPackage } from "../src/entities/tourpackage/model.ts";
import { emptySpec } from "../src/entities/tourpackage/spec.ts";
import { filterTasks, mapTaskPackageLink, packageLinkLabel, type Task } from "../src/entities/task/model.ts";
import { leadQueryParams } from "../src/entities/lead/lib/query.ts";
import { freshTaskDraft, validateTaskDraft } from "../src/features/create-task/model/draft.ts";
import {
  NO_PACKAGE,
  defaultDepartureId,
  isBookable,
  packageOptionLabel,
  pickOf,
  reconcileDeparture,
  samePick,
  searchPackages,
  todayLocal,
  upcomingDepartures,
} from "../src/features/package-link/model/pick.ts";
import { orderLinked, summarizeLinks } from "../src/widgets/packages-board/model/links.ts";

const TODAY = "2026-10-04";

function pkg(over: Partial<TourPackage> & { id: string; code: string }): TourPackage {
  return {
    branchId: "b1",
    nameEn: over.code,
    nameAr: "",
    description: "",
    isActive: true,
    salesOpen: true,
    kind: "umrah",
    category: "standard",
    durationDays: 10,
    transportMode: "flight_scheduled",
    capacityTotal: 40,
    baseCurrency: "SAR",
    spec: emptySpec(),
    stats: {
      departures: 0,
      reserved: 0,
      departureSeats: 0,
      remaining: 0,
      nextDepartDate: null,
      fromPrice: 0,
      fromCurrency: "SAR",
      costTotal: 0,
      suggestedPrice: 0,
    },
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

function dep(over: Partial<Departure> & { id: string; packageId: string; departDate: string }): Departure {
  return {
    code: over.id.toUpperCase(),
    returnDate: over.departDate,
    capacityTotal: 40,
    capacitySold: 0,
    basePrice: 0,
    currency: "SAR",
    isActive: true,
    salesClosed: false,
    softThresholdPct: 80,
    allowOversell: false,
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

function picks() {
  assert.deepEqual(pickOf(null, "d1"), NO_PACKAGE, "a departure without a package is dropped");
  assert.deepEqual(pickOf("p1", ""), { packageId: "p1", departureId: null });
  assert.ok(samePick(pickOf("p1", "d1"), { packageId: "p1", departureId: "d1" }));
  assert.ok(!samePick(pickOf("p1"), pickOf("p1", "d1")));
  assert.equal(packageOptionLabel({ code: "UMR-1", nameEn: "Ramadan", nameAr: "رمضان" }, "ar"), "UMR-1 · رمضان");
  assert.equal(packageOptionLabel({ code: "UMR-1", nameEn: "", nameAr: "رمضان" }, "en"), "UMR-1 · رمضان", "falls back to the other language");
  assert.equal(todayLocal(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
}

function search() {
  const makkah = { ...emptySpec().makkah, name: "Swissôtel Makkah" };
  const list = [
    pkg({ id: "1", code: "UMR-B", stats: { ...pkg({ id: "x", code: "x" }).stats, nextDepartDate: "2026-12-01" } }),
    pkg({ id: "2", code: "UMR-A", stats: { ...pkg({ id: "x", code: "x" }).stats, nextDepartDate: "2026-11-01" } }),
    pkg({ id: "3", code: "HAJ-1", kind: "hajj", salesOpen: false }),
    pkg({ id: "4", code: "OLD-1", isActive: false }),
    pkg({ id: "5", code: "UMR-VIP", nameEn: "VIP Ramadan", spec: { ...emptySpec(), makkah } }),
  ];
  assert.deepEqual(
    searchPackages(list, "").map((p) => p.code),
    ["UMR-A", "UMR-B", "UMR-VIP", "HAJ-1"],
    "on-sale first, soonest departure, then code; inactive hidden",
  );
  assert.deepEqual(searchPackages(list, "", { keepId: "4" }).map((p) => p.code).at(-1), "OLD-1", "an existing link stays visible");
  assert.deepEqual(searchPackages(list, "swiss").map((p) => p.code), ["UMR-VIP"], "matches hotel names");
  assert.deepEqual(searchPackages(list, "vip ramadan").map((p) => p.code), ["UMR-VIP"], "every word must match");
  assert.deepEqual(searchPackages(list, "hajj").map((p) => p.code), ["HAJ-1"], "matches the kind");
  assert.equal(searchPackages(list, "nothing-like-this").length, 0);
}

function departures() {
  const deps = [
    dep({ id: "past", packageId: "p1", departDate: "2026-09-01" }),
    dep({ id: "closed", packageId: "p1", departDate: "2026-10-10", salesClosed: true }),
    dep({ id: "full", packageId: "p1", departDate: "2026-10-12", capacitySold: 40 }),
    dep({ id: "open", packageId: "p1", departDate: "2026-10-20" }),
    dep({ id: "oversell", packageId: "p1", departDate: "2026-10-11", capacitySold: 40, allowOversell: true }),
    dep({ id: "off", packageId: "p1", departDate: "2026-10-05", isActive: false }),
    dep({ id: "other", packageId: "p2", departDate: "2026-10-06" }),
  ];
  assert.deepEqual(
    upcomingDepartures(deps.filter((d) => d.packageId === "p1"), TODAY).map((d) => d.id),
    ["closed", "oversell", "full", "open"],
    "active, from today, soonest first",
  );
  assert.equal(isBookable(deps[1]), false, "sales closed");
  assert.equal(isBookable(deps[2]), false, "full");
  assert.equal(isBookable(deps[4]), true, "full but oversell allowed");
  assert.equal(defaultDepartureId(deps.filter((d) => d.packageId === "p1"), TODAY), "oversell");
  assert.equal(defaultDepartureId([], TODAY), null);

  assert.deepEqual(reconcileDeparture(pickOf("p1", "other"), deps, TODAY, false), pickOf("p1"), "foreign departure dropped");
  assert.deepEqual(reconcileDeparture(pickOf("p1", "other"), deps, TODAY, true), pickOf("p1", "oversell"), "required fills the soonest bookable");
  assert.deepEqual(reconcileDeparture(pickOf("p1", "full"), deps, TODAY, true), pickOf("p1", "full"), "an explicit choice is kept");
  assert.deepEqual(reconcileDeparture(pickOf("p2"), deps, TODAY, true), pickOf("p2", "other"));
  assert.deepEqual(reconcileDeparture(NO_PACKAGE, deps, TODAY, true), NO_PACKAGE);
}

function wire() {
  assert.equal(mapTaskPackageLink(null), null);
  assert.equal(mapTaskPackageLink({ package_id: "" }), null);
  const link = mapTaskPackageLink({
    package_id: "p1",
    package_code: "UMR-1",
    package_name: "Ramadan",
    package_name_ar: "رمضان",
    departure_id: "d1",
    departure_code: "D-0310",
    depart_date: "2027-03-10T00:00:00Z",
  });
  assert.deepEqual(link, {
    packageId: "p1",
    packageCode: "UMR-1",
    packageName: "Ramadan",
    packageNameAr: "رمضان",
    departureId: "d1",
    departureCode: "D-0310",
    departDate: "2027-03-10",
  });
  assert.equal(packageLinkLabel(link!, "en"), "UMR-1 · Ramadan · D-0310");
  assert.equal(packageLinkLabel({ ...link!, departureCode: "" }, "ar"), "UMR-1 · رمضان");

  const base: Task = {
    id: "t1", branchId: "b", title: "Call", description: "", kind: "followup", status: "open", priority: "minor",
    outcome: "", assigneeId: "u", assigneeName: "Ali", relatedType: "", relatedId: "", relatedLabel: "",
    dueAt: null, escalatedAt: null, createdAt: "2026-10-01", updatedAt: "2026-10-01", completedAt: null,
  };
  const tasks = [base, { ...base, id: "t2", title: "Visa", pkg: link }];
  assert.deepEqual(filterTasks(tasks, { q: "umr-1" }).map((t) => t.id), ["t2"], "board search matches the package code");
  assert.deepEqual(filterTasks(tasks, { q: "رمضان" }).map((t) => t.id), ["t2"], "and the Arabic name");

  assert.equal(leadQueryParams({ packageId: "p1" }).get("package_id"), "p1");
  assert.equal(leadQueryParams({}).has("package_id"), false);
}

function drafts() {
  const now = new Date(2026, 9, 4, 9, 0);
  const me = { id: "u1", name: "Me" };
  const plain = freshTaskDraft(now, me);
  assert.equal(plain.packageId, null);
  assert.equal(plain.departureId, null);

  const fromLead = { relatedType: "lead", relatedId: "l1", relatedLabel: "Ahmed", customerId: "c1", packageId: "p1" };
  const draft = { ...freshTaskDraft(now, me, fromLead), title: "Send quote" };
  assert.equal(draft.packageId, "p1", "lead package prefilled");
  const { input } = validateTaskDraft(draft, now, fromLead);
  assert.ok(input);
  assert.equal(input.relatedType, "lead");
  assert.equal(input.relatedId, "l1");
  assert.equal(input.customerId, "c1");
  assert.equal(input.packageId, "p1");
  assert.equal(input.departureId, null);

  const withDep = { ...draft, departureId: "d1" };
  assert.equal(validateTaskDraft(withDep, now, fromLead).input?.departureId, "d1");

  const cleared = { ...draft, packageId: null, departureId: null };
  const out = validateTaskDraft(cleared, now, fromLead).input!;
  assert.equal("packageId" in out, false, "a cleared package is not sent");
  assert.equal(out.relatedId, "l1", "the related record stays");

  const pkgOnly = { ...freshTaskDraft(now, me, { packageId: "p9", departureId: "d9" }), title: "Rooming list" };
  const pkgInput = validateTaskDraft(pkgOnly, now, { packageId: "p9" }).input!;
  assert.equal(pkgInput.packageId, "p9");
  assert.equal(pkgInput.departureId, "d9");
  assert.equal(pkgInput.relatedType, undefined, "a package-page task has no related record");

  assert.equal(freshTaskDraft(now, me, { departureId: "d1" }).departureId, null, "no departure without a package");
}

function links() {
  const now = new Date("2026-10-04T12:00:00Z");
  const summary = summarizeLinks(
    {
      leads: [{ stage: "new" }, { stage: "proposal" }, { stage: "won" }, { stage: "lost" }],
      tasks: [
        { status: "open", dueAt: "2026-10-01T09:00:00Z" },
        { status: "in_progress", dueAt: "2026-10-09T09:00:00Z" },
        { status: "open", dueAt: null },
        { status: "done", dueAt: "2026-09-01T09:00:00Z" },
      ],
      bookings: [
        { status: "confirmed", paxCount: 3 },
        { status: "draft", paxCount: 2 },
        { status: "cancelled", paxCount: 9 },
      ],
    },
    now,
  );
  assert.deepEqual(summary, { openLeads: 2, openTasks: 3, overdueTasks: 1, activeBookings: 2, bookedPax: 5, total: 11 });
  assert.deepEqual(summarizeLinks({ leads: [], tasks: [], bookings: [] }), {
    openLeads: 0, openTasks: 0, overdueTasks: 0, activeBookings: 0, bookedPax: 0, total: 0,
  });

  const rows = [
    { id: "a", open: false, updatedAt: "2026-10-03" },
    { id: "b", open: true, updatedAt: "2026-10-01" },
    { id: "c", open: true, updatedAt: "2026-10-02" },
  ];
  assert.deepEqual(orderLinked(rows, (r) => r.open).map((r) => r.id), ["c", "b", "a"], "open first, newest first");
}

const groups = { picks, search, departures, wire, drafts, links };
for (const [name, run] of Object.entries(groups)) {
  try {
    run();
  } catch (err) {
    console.error(`✗ ${name}`);
    throw err;
  }
}
console.log(`package-links selftest OK — ${Object.keys(groups).length} groups`);
