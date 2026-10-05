/**
 * Pure finance rules shared by previews and the demo twin. They mirror the backend
 * (internal/domain/finance) so a preview never disagrees with what the server books.
 */
import {
  AGEING_BUCKETS,
  BPS,
  BSP_TYPES,
  type AgeingBucket,
  type Agency,
  type BspLineInput,
  type BspType,
  type CurrencyShare,
  type Direction,
  type Exposure,
  type FeedRow,
  type RefundInput,
  type RefundSettlement,
  type Risk,
} from "../model";

/** amount × bps / 10 000, rounded half away from zero (integer minor units). */
export function applyBps(amount: number, bps: number): number {
  const p = amount * bps;
  return p >= 0 ? Math.floor((p + BPS / 2) / BPS) : -Math.floor((-p + BPS / 2) / BPS);
}

/** part / whole in basis points, rounded half away from zero; 0 when whole is 0. */
export function ratioBps(part: number, whole: number): number {
  if (whole === 0) return 0;
  const v = Math.floor((Math.abs(part) * BPS + Math.abs(whole) / 2) / Math.abs(whole));
  return (part < 0) !== (whole < 0) ? -v : v;
}

/** Basis points → percent number (1250 → 12.5). */
export const bpsToPercent = (bps: number): number => bps / 100;

/** User-typed percent ("12,5") → basis points, or null when invalid. */
export function percentToBps(input: string): number | null {
  const m = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

export function posFee(amount: number, commissionBps: number): number {
  return applyBps(amount, commissionBps);
}

/** Credit grade of an agency; same thresholds as the server. */
export function riskOf(agency: Pick<Agency, "creditLimit" | "graceDays" | "status">, e: Exposure): Risk {
  const usedPct = agency.creditLimit > 0 ? Math.min(Math.max(Math.trunc((e.outstanding * 100) / agency.creditLimit), 0), 999) : 0;
  const available = agency.creditLimit - e.outstanding;
  if (agency.status !== "active") return { available, usedPct, level: "blocked" };
  if (usedPct >= 90 || (e.overdue > 0 && e.oldestOverdueDays > agency.graceDays)) return { available, usedPct, level: "critical" };
  if (usedPct >= 70 || e.overdue > 0) return { available, usedPct, level: "watch" };
  return { available, usedPct, level: "ok" };
}

export function emptyBuckets(): Record<AgeingBucket, number> {
  return Object.fromEntries(AGEING_BUCKETS.map((b) => [b, 0])) as Record<AgeingBucket, number>;
}

/** Which ageing bucket a due date falls in on `today` (YYYY-MM-DD strings). */
export function bucketOf(dueOn: string | null, today: string): AgeingBucket {
  if (!dueOn) return "unscheduled";
  const days = daysBetween(dueOn, today);
  if (days <= 0) return "current";
  if (days <= 15) return "d0_15";
  if (days <= 30) return "d16_30";
  return "d31_plus";
}

/** Whole days from a to b (YYYY-MM-DD), positive when b is later. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Who gets what when a booking is cancelled after the supplier charged a penalty. */
export function settleRefund(i: RefundInput): RefundSettlement {
  const owed = i.supplierPenalty + i.serviceFee;
  const customerRefund = Math.max(i.paid - owed, 0);
  const supplierRefund = Math.max(i.supplierCost - i.supplierPenalty, 0);
  return {
    customerRefund,
    supplierRefund,
    retained: i.paid - customerRefund,
    shortfall: Math.max(owed - i.paid, 0),
    agencyResult: i.paid + supplierRefund - i.supplierCost - customerRefund,
  };
}

/** Largest-remainder shares in bps that always sum to 10 000 across convertible items. */
export function shares(items: readonly Omit<CurrencyShare, "shareBps">[]): CurrencyShare[] {
  const total = items.reduce((s, x) => (!x.unconverted && x.converted > 0 ? s + x.converted : s), 0);
  const out: CurrencyShare[] = items.map((x) => ({ ...x, shareBps: 0 }));
  if (total === 0) return out;
  const rems: { i: number; r: number }[] = [];
  let assigned = 0;
  out.forEach((x, i) => {
    if (x.unconverted || x.converted <= 0) return;
    const num = x.converted * BPS;
    x.shareBps = Math.floor(num / total);
    assigned += x.shareBps;
    rems.push({ i, r: num % total });
  });
  rems.sort((a, b) => b.r - a.r);
  for (let k = 0; assigned < BPS && k < rems.length; k++, assigned++) out[rems[k].i].shareBps++;
  return out.sort((a, b) => b.converted - a.converted);
}

const REF_NO = /(?:\b(?:WCC|REZ|RES|BOOKING|BKG|BK|REF)[\s\-_:#]*|#)(\d{1,10})\b/gi;
const PNR = /\b[A-Z0-9]{6}\b/g;

/** Booking numbers and PNR-like tokens in a transfer description (same rules as the server). */
export function extractRefs(text: string): { refNos: number[]; pnrs: string[] } {
  const refNos: number[] = [];
  for (const m of text.matchAll(REF_NO)) {
    const n = Number(m[1]);
    if (n > 0 && !refNos.includes(n)) refNos.push(n);
  }
  const pnrs: string[] = [];
  for (const m of text.toUpperCase().matchAll(PNR)) {
    if (/[A-Z]/.test(m[0]) && /\d/.test(m[0]) && !pnrs.includes(m[0])) pnrs.push(m[0]);
  }
  return { refNos, pnrs };
}

/** "BK-000123" for a booking number (0 → ""). */
export function refCode(n: number): string {
  return n > 0 ? `BK-${String(n).padStart(6, "0")}` : "";
}

// ---- CSV import (bank statements, BSP billing) ----

export type CsvError = { line: number; reason: "columns" | "date" | "amount" | "type" | "empty" };
export type CsvResult<T> = { rows: T[]; errors: CsvError[] };

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === sep && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

function detectSep(header: string): string {
  const counts = [";", ",", "\t"].map((s) => [s, header.split(s).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

/** "2026-10-05", "05.10.2026" or "05/10/2026" → ISO day, else null. */
export function parseDay(v: string): string | null {
  const s = v.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return valid(`${m[1]}-${m[2]}-${m[3]}`);
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s);
  if (m) return valid(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  return null;
}

function valid(day: string): string | null {
  const d = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day ? null : day;
}

/**
 * Signed amount in minor units from bank-style text: "1.250,50", "1,250.50", "-300", "(300)".
 * The last separator followed by 1–2 digits is the decimal mark.
 */
export function parseSignedAmount(v: string): number | null {
  let s = v.trim().replace(/\s/g, "").replace(/[^\d.,()+-]/g, "");
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    neg = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) s = s.slice(1);
  const dec = /[.,](\d{1,2})$/.exec(s);
  const whole = (dec ? s.slice(0, dec.index) : s).replace(/[.,]/g, "");
  if (!/^\d{1,13}$/.test(whole)) return null;
  const minor = Number(whole) * 100 + Number((dec?.[1] ?? "").padEnd(2, "0"));
  return neg ? -minor : minor;
}

/** Header cell → ascii key; folds Turkish letters so "Açıklama" and "Karşı Taraf" are recognised. */
const headerKey = (c: string) =>
  c
    .toLowerCase()
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z_]/g, "");
const headerIndex = (cols: string[], names: string[]) => cols.findIndex((c) => names.includes(headerKey(c)));

/**
 * Bank statement CSV with a header row. Recognised columns: date, amount (signed) or
 * debit/credit, description, counterparty, id/reference. Rows without an id get a stable
 * one from their content so re-imports are de-duplicated.
 */
export function parseBankCsv(text: string): CsvResult<FeedRow> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], errors: [{ line: 1, reason: "empty" }] };
  const sep = detectSep(lines[0]);
  const head = splitCsvLine(lines[0], sep);
  const at = {
    date: headerIndex(head, ["date", "tarih", "valuedate", "occurred_on", "occurredon"]),
    amount: headerIndex(head, ["amount", "tutar", "miktar"]),
    credit: headerIndex(head, ["credit", "alacak", "in"]),
    debit: headerIndex(head, ["debit", "borc", "out"]),
    desc: headerIndex(head, ["description", "aciklama", "details", "narrative"]),
    party: headerIndex(head, ["counterparty", "karsitaraf", "sender", "name"]),
    id: headerIndex(head, ["id", "reference", "referans", "transaction_id", "transactionid", "external_id", "externalid"]),
  };
  if (at.date < 0 || (at.amount < 0 && at.credit < 0 && at.debit < 0)) return { rows: [], errors: [{ line: 1, reason: "columns" }] };
  const rows: FeedRow[] = [];
  const errors: CsvError[] = [];
  lines.slice(1).forEach((raw, i) => {
    const line = i + 2;
    const c = splitCsvLine(raw, sep);
    const day = parseDay(c[at.date] ?? "");
    if (!day) return errors.push({ line, reason: "date" });
    let signed: number | null;
    if (at.amount >= 0) signed = parseSignedAmount(c[at.amount] ?? "");
    else {
      const cr = parseSignedAmount(c[at.credit] ?? "") ?? 0;
      const dr = parseSignedAmount(c[at.debit] ?? "") ?? 0;
      signed = Math.abs(cr) - Math.abs(dr);
    }
    if (!signed) return errors.push({ line, reason: "amount" });
    const description = at.desc >= 0 ? (c[at.desc] ?? "") : "";
    const counterparty = at.party >= 0 ? (c[at.party] ?? "") : "";
    const direction: Direction = signed > 0 ? "in" : "out";
    const externalId = (at.id >= 0 && c[at.id]) || fingerprint(`${day}|${signed}|${description}|${counterparty}|${line}`);
    rows.push({ externalId: externalId.slice(0, 120), occurredOn: day, amount: Math.abs(signed), direction, description: description.slice(0, 500), counterparty: counterparty.slice(0, 200) });
  });
  return { rows, errors };
}

/** Short deterministic id (FNV-1a) for rows a bank exported without one. */
export function fingerprint(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `row-${(h >>> 0).toString(16).padStart(8, "0")}`;
}

/** BSP billing CSV: document, pnr, type (sale/refund/adm/acm), passenger, issued date, amount. */
export function parseBspCsv(text: string): CsvResult<BspLineInput> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], errors: [{ line: 1, reason: "empty" }] };
  const sep = detectSep(lines[0]);
  const head = splitCsvLine(lines[0], sep);
  const at = {
    doc: headerIndex(head, ["document", "document_no", "documentno", "ticket", "ticket_no", "ticketno", "tkt"]),
    pnr: headerIndex(head, ["pnr", "record_locator", "recordlocator"]),
    type: headerIndex(head, ["type", "trnc", "transaction"]),
    pax: headerIndex(head, ["passenger", "pax", "name"]),
    date: headerIndex(head, ["date", "issued", "issued_on", "issuedon", "issue_date"]),
    amount: headerIndex(head, ["amount", "net", "total", "fare"]),
  };
  if (at.doc < 0 || at.pnr < 0 || at.amount < 0) return { rows: [], errors: [{ line: 1, reason: "columns" }] };
  const rows: BspLineInput[] = [];
  const errors: CsvError[] = [];
  lines.slice(1).forEach((raw, i) => {
    const line = i + 2;
    const c = splitCsvLine(raw, sep);
    const amount = parseSignedAmount(c[at.amount] ?? "");
    if (amount === null || amount === 0) return errors.push({ line, reason: "amount" });
    const t = (at.type >= 0 ? (c[at.type] ?? "sale") : "sale").toLowerCase();
    const type: BspType | null = (BSP_TYPES as readonly string[]).includes(t) ? (t as BspType) : t === "tkt" || t === "tktt" ? "sale" : t === "rfnd" ? "refund" : null;
    if (!type) return errors.push({ line, reason: "type" });
    const issuedOn = at.date >= 0 && c[at.date] ? parseDay(c[at.date]) : null;
    if (at.date >= 0 && c[at.date] && !issuedOn) return errors.push({ line, reason: "date" });
    rows.push({
      documentNo: (c[at.doc] ?? "").slice(0, 20),
      pnr: (c[at.pnr] ?? "").toUpperCase().slice(0, 12),
      type,
      passenger: at.pax >= 0 ? (c[at.pax] ?? "").slice(0, 120) : "",
      issuedOn: issuedOn ?? "",
      amount: Math.abs(amount),
    });
  });
  return { rows, errors };
}
