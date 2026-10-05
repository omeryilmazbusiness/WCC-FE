/**
 * Self-test for the bookings workspace rules (list query, party / summary labels, profit,
 * option urgency, share links and the printable documents).
 * Run: npm run test:bookings
 */
import assert from "node:assert/strict";
import {
  bookingListQuery,
  bookingPartyName,
  bookingProfit,
  bookingSummary,
  clampPaymentAmount,
  collectedPct,
  dialablePhone,
  endOfLocalDay,
  extraPax,
  mailtoUrl,
  stayNights,
  ttlUrgency,
  whatsappUrl,
} from "../src/entities/booking/lib/workspace.ts";
import { DEFAULT_FILTERS, activeFilterCount, toListParams } from "../src/widgets/bookings-board/model/list-filters.ts";
import { DOCUMENT_KINDS, DOCUMENT_LANGS, escapeHtml, renderBookingDocument, type DocumentData } from "../src/entities/booking/lib/documents.ts";

const info = {
  customerName: "Ahmet Yılmaz",
  customerNameAr: "أحمد",
  ownerName: "",
  packageId: null,
  packageCode: "",
  packageName: "Ramadan Umrah",
  packageNameAr: "عمرة رمضان",
  packageKind: "umrah",
  departureCode: "",
  departDate: "2027-03-05",
  returnDate: "2027-03-17",
  makkahHotel: "Swissôtel",
  madinahHotel: "Pullman",
  flightRouting: "",
  participantsCount: 0,
  refundedAmt: 0,
  overdueSchedule: false,
  visaPending: 0,
  openChanges: 0,
};

function listQuery() {
  assert.equal(bookingListQuery(), "limit=200");
  const qs = new URLSearchParams(
    bookingListQuery({ q: "  xk9 ", segment: "option_today", channel: "b2b_agency", from: "2027-01-01", to: "2027-01-31", sort: "ttl", limit: 999 }),
  );
  assert.equal(qs.get("q"), "xk9");
  assert.equal(qs.get("segment"), "option_today");
  assert.equal(qs.get("channel"), "b2b_agency");
  assert.equal(qs.get("date_field"), "created", "date field defaults when a range is set");
  assert.equal(qs.get("to"), "2027-01-31");
  assert.equal(qs.get("limit"), "200", "limit is capped at the server maximum");
  assert.equal(new URLSearchParams(bookingListQuery({ dateField: "depart" })).get("date_field"), null, "no range, no date field");
  assert.match(endOfLocalDay(new Date(2027, 0, 1, 9)), /^\d{4}-\d{2}-\d{2}T\d{2}:59:59Z$/);
}

function labels() {
  const b = { channel: "agent" as const, companyName: "", summary: "", info };
  assert.equal(bookingPartyName(b, "en"), "Ahmet Yılmaz");
  assert.equal(bookingPartyName(b, "ar"), "أحمد");
  assert.equal(bookingPartyName({ ...b, channel: "b2b_agency", companyName: "Al Noor" }, "en"), "Al Noor", "B2B shows the agency");
  assert.equal(extraPax(3), 2);
  assert.equal(extraPax(0), 0);
  assert.equal(bookingSummary({ ...b, summary: " IST - JFK " }, "en"), "IST - JFK");
  assert.equal(bookingSummary(b, "en"), "Swissôtel · Pullman");
  assert.equal(bookingSummary({ ...b, info: { ...info, makkahHotel: "", madinahHotel: "" } }, "ar"), "عمرة رمضان");
  assert.equal(stayNights("2027-03-05", "2027-03-10"), 5);
  assert.equal(stayNights("2027-03-10", "2027-03-05"), 0);
  assert.equal(stayNights(null, "2027-03-05"), 0);
}

function money() {
  assert.deepEqual(bookingProfit({ totalAmount: 120000, costAmt: 100000 }), { net: 100000, gross: 120000, profit: 20000, markupPct: 20, marginPct: 16.7 });
  assert.equal(bookingProfit({ totalAmount: 0, costAmt: 0 }).markupPct, null);
  assert.equal(collectedPct({ totalAmount: 1000, collectedAmt: 250 }), 25);
  assert.equal(collectedPct({ totalAmount: 1000, collectedAmt: 5000 }), 100);
  assert.equal(collectedPct({ totalAmount: 0, collectedAmt: 0 }), 0);
  assert.equal(clampPaymentAmount(0, 5000), 5000, "blank amount = whole balance");
  assert.equal(clampPaymentAmount(9000, 5000), 5000, "never more than the balance");
  assert.equal(clampPaymentAmount(1234.9, 5000), 1234);
}

function urgency() {
  const now = Date.parse("2027-01-01T12:00:00Z");
  assert.equal(ttlUrgency(null, now), "none");
  assert.equal(ttlUrgency("2027-01-01T11:00:00Z", now), "expired");
  assert.equal(ttlUrgency("2027-01-01T13:00:00Z", now), "urgent");
  assert.equal(ttlUrgency("2027-01-01T20:00:00Z", now), "soon");
  assert.equal(ttlUrgency("2027-01-03T12:00:00Z", now), "ok");
}

function share() {
  assert.equal(dialablePhone("+90 (532) 111-22-33"), "905321112233");
  assert.equal(dialablePhone("0090 532 111 22 33"), "905321112233");
  assert.equal(dialablePhone("123"), "");
  assert.equal(whatsappUrl("+90 532 111 22 33", "Hi & bye"), "https://wa.me/905321112233?text=Hi%20%26%20bye");
  assert.equal(mailtoUrl(" a@b.co ", "Sub", "Body"), "mailto:a%40b.co?subject=Sub&body=Body");
}

function documents() {
  const data: DocumentData = {
    company: { name: "Acme <Travel>", logoUrl: "https://x.test/logo.png" },
    refCode: "BK-000001",
    pnr: "XK9P2A",
    issuedAt: "2026-10-05T08:00:00Z",
    serviceType: "package",
    supplierSource: "saadia",
    status: "confirmed",
    summary: "",
    packageName: "Ramadan Umrah",
    departDate: "2027-03-05",
    returnDate: "2027-03-17",
    makkahHotel: "Swissôtel",
    madinahHotel: "Pullman",
    airline: "Saudia",
    outbound: { route: "IST-JED", flightNo: "SV262", date: "2027-03-05" },
    inbound: null,
    busClass: "VIP",
    guide: "Ali",
    customer: { name: "Ahmet \"Q\" Yılmaz", phone: "+90", email: "a@b.co" },
    travellers: [{ name: "Ahmet", gender: "male", passportLast4: "4567", dateOfBirth: "1990-01-01" }],
    lines: [{ label: "Umrah", quantity: 2, unitPrice: 150000, total: 300000 }],
    currency: "SAR",
    totalAmount: 300000,
    discountAmt: 0,
    collectedAmt: 100000,
    balanceAmt: 200000,
  };
  assert.equal(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
  for (const kind of DOCUMENT_KINDS) {
    for (const lang of DOCUMENT_LANGS) {
      const html = renderBookingDocument(kind, lang, data);
      assert.ok(html.startsWith("<!doctype html>"), `${kind}/${lang} is a full page`);
      assert.ok(html.includes(`dir="${lang === "ar" ? "rtl" : "ltr"}"`), `${kind}/${lang} direction`);
      assert.ok(html.includes("Acme &lt;Travel&gt;") && !html.includes("Acme <Travel>"), "company name is escaped");
      assert.ok(html.includes("BK-000001"));
      assert.ok(!/onclick=/i.test(html), "no inline handlers");
    }
  }
  const contract = renderBookingDocument("contract", "tr", data);
  assert.ok(contract.includes("KVKK"), "Turkish contract carries the KVKK consent");
  assert.ok(contract.includes("••••4567"), "passport is masked to its last 4");
  const voucher = renderBookingDocument("voucher", "en", data);
  assert.ok(!voucher.includes("4567"), "voucher omits passport numbers");
  assert.ok(renderBookingDocument("proforma", "en", data).includes("Balance due"));
  assert.ok(renderBookingDocument("voucher", "tr", data).includes("Onaylı"), "status follows the document language");
  assert.ok(renderBookingDocument("voucher", "ar", data).includes("حج / عمرة"), "service follows the document language");
}

function listFilters() {
  const end = "2026-10-05T20:59:59.999Z";
  const base = toListParams(DEFAULT_FILTERS, "  ", {}, end);
  assert.equal(base.q, undefined, "blank search is dropped");
  assert.equal(base.segment, undefined, "'all' is dropped");
  assert.equal(base.sort, undefined, "default sort is implicit");
  assert.equal(base.dateField, undefined, "date field only with a range");
  assert.equal(base.dayEnd, end);
  const p = toListParams(
    { ...DEFAULT_FILTERS, segment: "visa_pending", service: "package", sort: "ttl", dateField: "depart", from: "2026-12-01", to: "2026-11-01" },
    " AB12 ",
    { customerId: "c1" },
    end,
  );
  assert.equal(p.q, "AB12");
  assert.equal(p.customerId, "c1");
  assert.equal(p.serviceType, "package");
  assert.equal(p.dateField, "depart");
  assert.deepEqual([p.from, p.to], ["2026-11-01", "2026-12-01"], "reversed range is swapped");
  assert.equal(activeFilterCount(DEFAULT_FILTERS), 0);
  assert.equal(activeFilterCount({ ...DEFAULT_FILTERS, channel: "b2b_agency", from: "2026-01-01" }), 2);
}

listQuery();
listFilters();
labels();
money();
urgency();
share();
documents();
console.log("bookings selftest: ok");
