/**
 * Self-test: Operations → Buses catalogue (operator card, draft, repo, nav).
 * Run: npm run test:buses
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { busCompanyIssues, emptyBusCompanyInput, searchText, type BusCompany } from "../src/entities/bus/model.ts";
import { MemoryBusRepository, busPayload, mapBusCompany } from "../src/entities/bus/api.ts";
import { draftErrors, draftFromCompany, draftToInput, newDraft } from "../src/features/bus-form/model/draft.ts";
import { NAV_GROUPS, visibleNavGroups } from "../src/widgets/app-shell/model/nav.ts";
import { DEMO_ROLE_PERMISSIONS, ROUTE_PERMISSIONS } from "../src/shared/config/permissions.ts";
import { routes } from "../src/shared/config/routes.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function company(over: Partial<BusCompany> = {}): BusCompany {
  return {
    id: "c1",
    branchId: "b1",
    name: "Kamil Koç",
    phone: "+90 212 111 22 33",
    email: "ops@kamil.example",
    website: "https://kamil.example",
    country: "Turkey",
    city: "Istanbul",
    address: "Esenler",
    vehicleClass: "vip",
    licenseNo: "B-100",
    contactName: "Ali",
    contactPhone: "+90 532 000 11 22",
    notes: "",
    isActive: true,
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

function issues() {
  assert.equal(Object.keys(busCompanyIssues(emptyBusCompanyInput())).includes("name"), true);
  const ok = emptyBusCompanyInput();
  ok.name = "Metro Turizm";
  ok.phone = "+90 212 444 00 00";
  ok.email = "desk@metro.example";
  ok.country = "Turkey";
  ok.vehicleClass = "standard";
  assert.deepEqual(busCompanyIssues(ok), {});
  const bad = { ...ok, email: "not-mail", country: "x".repeat(81), phone: "x" };
  const errs = busCompanyIssues(bad);
  assert.equal(errs.email, "email");
  assert.equal(errs.country, "country");
  assert.equal(errs.phone, "phone");
}

function draft() {
  const d = draftFromCompany(company());
  assert.equal(d.name, "Kamil Koç");
  assert.equal(d.country, "Turkey");
  const input = draftToInput(d);
  assert.equal(input.country, "Turkey");
  assert.equal(input.vehicleClass, "vip");
  const empty = newDraft();
  assert.ok(Object.keys(draftErrors(empty)).includes("name"));
}

function mapping() {
  const raw = busPayload(draftToInput(draftFromCompany(company())));
  assert.equal(raw.vehicle_class, "vip");
  assert.equal(raw.country, "Turkey");
  assert.equal("fleet_size" in raw, false);
  assert.equal("plate_prefix" in raw, false);
  const mapped = mapBusCompany({
    id: "x",
    branch_id: "b",
    name: "Pamukkale",
    country: "Turkey",
    vehicle_class: "sleeper",
    is_active: true,
  });
  assert.equal(mapped.vehicleClass, "sleeper");
  assert.equal(mapped.country, "Turkey");
  assert.equal(mapped.isActive, true);
}

async function repo() {
  const mem = new MemoryBusRepository([]);
  const created = await mem.create({
    ...emptyBusCompanyInput(),
    name: "Nilüfer",
    city: "Bursa",
    country: "Turkey",
    vehicleClass: "mixed",
    phone: "+90 224 111 22 33",
  });
  const rows = await mem.list({ query: "bursa" });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, created.id);
  const hidden = await mem.update(created.id, { ...draftToInput(draftFromCompany(created)), isActive: false });
  assert.equal(hidden.isActive, false);
  assert.equal((await mem.list({ activeOnly: true })).length, 0);
  assert.ok(searchText(created).includes("bursa"));
}

function nav() {
  const ops = NAV_GROUPS.find((g) => g.id === "operations");
  assert.ok(ops);
  const labels = ops.items.map((i) => i.label);
  const flights = labels.indexOf("flights");
  const buses = labels.indexOf("buses");
  assert.ok(flights >= 0 && buses === flights + 1, `bus must sit under flights, got ${labels.join(",")}`);
  assert.equal(ROUTE_PERMISSIONS[routes.buses], "buses.read");
  const opsNav = visibleNavGroups(DEMO_ROLE_PERMISSIONS.operations);
  assert.ok(opsNav.some((g) => g.items.some((i) => i.href === routes.buses)));
  const employee = visibleNavGroups(DEMO_ROLE_PERMISSIONS.employee);
  assert.ok(employee.some((g) => g.items.some((i) => i.href === routes.buses)));
  const admin = visibleNavGroups(DEMO_ROLE_PERMISSIONS.admin);
  assert.equal(admin.some((g) => g.items.some((i) => i.href === routes.buses)), false);
}

function i18n() {
  const en = JSON.parse(read("src/shared/i18n/messages/en.json"));
  const ar = JSON.parse(read("src/shared/i18n/messages/ar.json"));
  assert.equal(en.nav.buses, "Buses");
  assert.ok(String(ar.nav.buses).length > 1);
  for (const loc of [en, ar]) {
    assert.ok(loc.buses.title);
    assert.ok(loc.buses.form.createTitle);
    assert.ok(loc.buses.classes.vip);
    assert.ok(loc.buses.fields.name);
  }
  const src = read("src/widgets/app-shell/model/nav.ts");
  assert.match(src, /href: routes\.buses/);
  assert.match(src, /label: "buses"/);
}

issues();
draft();
mapping();
await repo();
nav();
i18n();
console.log("selftest-buses: ok");
