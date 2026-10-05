/**
 * Printable customer documents (e-voucher, e-ticket, proforma, contract) rendered as a
 * self-contained HTML page. The document language is independent of the UI locale so an
 * Arabic-speaking agent can hand a Turkish customer a Turkish contract.
 */

export const DOCUMENT_KINDS = ["voucher", "eticket", "proforma", "contract"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_LANGS = ["tr", "en", "ar"] as const;
export type DocumentLang = (typeof DOCUMENT_LANGS)[number];

export type DocumentParty = { name: string; phone: string; email: string };

export type DocumentTraveller = { name: string; gender: string; passportLast4: string; dateOfBirth: string | null };

export type DocumentLine = { label: string; quantity: number; unitPrice: number; total: number };

export type DocumentFlightLeg = { route: string; flightNo: string; date: string };

export type DocumentData = {
  company: { name: string; logoUrl: string | null };
  refCode: string;
  pnr: string;
  issuedAt: string;
  /** Codes; translated into the document language. */
  serviceType: string;
  supplierSource: string;
  status: string;
  summary: string;
  packageName: string;
  departDate: string | null;
  returnDate: string | null;
  makkahHotel: string;
  madinahHotel: string;
  airline: string;
  outbound: DocumentFlightLeg | null;
  inbound: DocumentFlightLeg | null;
  busClass: string;
  guide: string;
  customer: DocumentParty;
  travellers: DocumentTraveller[];
  lines: DocumentLine[];
  currency: string;
  totalAmount: number;
  discountAmt: number;
  collectedAmt: number;
  balanceAmt: number;
};

type Dict = Record<
  | DocumentKind
  | "ref"
  | "pnr"
  | "issued"
  | "customer"
  | "phone"
  | "email"
  | "service"
  | "supplier"
  | "status"
  | "trip"
  | "depart"
  | "return"
  | "makkah"
  | "madinah"
  | "flights"
  | "outbound"
  | "inbound"
  | "transfer"
  | "guide"
  | "travellers"
  | "name"
  | "gender"
  | "passport"
  | "dob"
  | "item"
  | "qty"
  | "unit"
  | "amount"
  | "subtotal"
  | "discount"
  | "total"
  | "paid"
  | "balance"
  | "terms"
  | "termsBody"
  | "kvkkTitle"
  | "kvkkBody"
  | "consent"
  | "customerSign"
  | "agencySign"
  | "voucherNote"
  | "ticketNote"
  | "proformaNote"
  | "print"
  | "male"
  | "female",
  string
>;

const DICT: Record<DocumentLang, Dict> = {
  tr: {
    voucher: "E-Voucher",
    eticket: "E-Bilet",
    proforma: "Proforma Fatura",
    contract: "Paket Tur Sözleşmesi",
    ref: "Rezervasyon No",
    pnr: "PNR",
    issued: "Düzenlenme",
    customer: "Müşteri",
    phone: "Telefon",
    email: "E-posta",
    service: "Hizmet",
    supplier: "Tedarikçi",
    status: "Durum",
    trip: "Seyahat Bilgileri",
    depart: "Gidiş",
    return: "Dönüş",
    makkah: "Mekke Oteli",
    madinah: "Medine Oteli",
    flights: "Uçuşlar",
    outbound: "Gidiş Uçuşu",
    inbound: "Dönüş Uçuşu",
    transfer: "Transfer",
    guide: "Rehber",
    travellers: "Yolcular",
    name: "Ad Soyad",
    gender: "Cinsiyet",
    passport: "Pasaport",
    dob: "Doğum Tarihi",
    item: "Kalem",
    qty: "Adet",
    unit: "Birim",
    amount: "Tutar",
    subtotal: "Ara Toplam",
    discount: "İndirim",
    total: "Genel Toplam",
    paid: "Tahsil Edilen",
    balance: "Kalan",
    terms: "Genel Şartlar",
    termsBody:
      "İptal ve değişiklikler acentenin iptal politikasına tabidir. Kalkıştan 45 gün öncesine kadar %10, 30 gün %25, 15 gün %50, 7 gün %75, son 7 günde %100 ceza uygulanır. Vize, uçuş ve otel sağlayıcılarının kuralları saklıdır.",
    kvkkTitle: "KVKK Aydınlatma ve Açık Rıza",
    kvkkBody:
      "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında; kimlik, pasaport, iletişim ve sağlık beyanı verileriniz rezervasyonun yürütülmesi, vize ve konaklama işlemleri amacıyla işlenecek, yalnızca ilgili tedarikçiler ve resmi kurumlarla paylaşılacaktır. Haklarınız için acentemizle iletişime geçebilirsiniz.",
    consent: "Kişisel verilerimin yukarıda belirtilen amaçlarla işlenmesine ve aktarılmasına açık rıza veriyorum.",
    customerSign: "Müşteri İmzası",
    agencySign: "Acente Kaşe / İmza",
    voucherNote: "Bu belgeyi otel ve transfer noktalarında ibraz ediniz.",
    ticketNote: "Uçuştan en az 3 saat önce havalimanında olunuz. Bagaj hakları bilet kurallarına tabidir.",
    proformaNote: "Bu belge ödeme bilgilendirmesi içindir; resmi fatura yerine geçmez.",
    print: "Yazdır / PDF",
    male: "Erkek",
    female: "Kadın",
  },
  en: {
    voucher: "E-Voucher",
    eticket: "E-Ticket",
    proforma: "Proforma Invoice",
    contract: "Package Tour Agreement",
    ref: "Booking No",
    pnr: "PNR",
    issued: "Issued",
    customer: "Customer",
    phone: "Phone",
    email: "Email",
    service: "Service",
    supplier: "Supplier",
    status: "Status",
    trip: "Trip details",
    depart: "Departure",
    return: "Return",
    makkah: "Makkah hotel",
    madinah: "Madinah hotel",
    flights: "Flights",
    outbound: "Outbound",
    inbound: "Return flight",
    transfer: "Transfer",
    guide: "Guide",
    travellers: "Travellers",
    name: "Full name",
    gender: "Gender",
    passport: "Passport",
    dob: "Date of birth",
    item: "Item",
    qty: "Qty",
    unit: "Unit",
    amount: "Amount",
    subtotal: "Subtotal",
    discount: "Discount",
    total: "Total",
    paid: "Paid",
    balance: "Balance due",
    terms: "Terms",
    termsBody:
      "Cancellations and changes follow the agency cancellation policy: 10% up to 45 days before departure, 25% at 30 days, 50% at 15 days, 75% at 7 days and 100% within the last 7 days. Visa, airline and hotel supplier rules also apply.",
    kvkkTitle: "Data protection notice and consent",
    kvkkBody:
      "Your identity, passport, contact and health declaration data are processed to fulfil this booking and the related visa and accommodation formalities, and are shared only with the suppliers and authorities involved. Contact the agency to exercise your rights.",
    consent: "I consent to the processing and transfer of my personal data for the purposes above.",
    customerSign: "Customer signature",
    agencySign: "Agency stamp / signature",
    voucherNote: "Present this voucher at the hotel and transfer desks.",
    ticketNote: "Be at the airport at least 3 hours before departure. Baggage allowance follows the fare rules.",
    proformaNote: "This document is a payment advice and is not a tax invoice.",
    print: "Print / PDF",
    male: "Male",
    female: "Female",
  },
  ar: {
    voucher: "قسيمة إلكترونية",
    eticket: "تذكرة إلكترونية",
    proforma: "فاتورة مبدئية",
    contract: "عقد رحلة سياحية",
    ref: "رقم الحجز",
    pnr: "رمز الحجز",
    issued: "تاريخ الإصدار",
    customer: "العميل",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    service: "الخدمة",
    supplier: "المورّد",
    status: "الحالة",
    trip: "تفاصيل الرحلة",
    depart: "المغادرة",
    return: "العودة",
    makkah: "فندق مكة",
    madinah: "فندق المدينة",
    flights: "الرحلات الجوية",
    outbound: "رحلة الذهاب",
    inbound: "رحلة العودة",
    transfer: "النقل",
    guide: "المرشد",
    travellers: "المسافرون",
    name: "الاسم الكامل",
    gender: "الجنس",
    passport: "جواز السفر",
    dob: "تاريخ الميلاد",
    item: "البند",
    qty: "الكمية",
    unit: "سعر الوحدة",
    amount: "المبلغ",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    total: "الإجمالي",
    paid: "المدفوع",
    balance: "المتبقي",
    terms: "الشروط العامة",
    termsBody:
      "تخضع الإلغاءات والتعديلات لسياسة الإلغاء: ‎10%‎ حتى 45 يومًا قبل المغادرة، ‎25%‎ عند 30 يومًا، ‎50%‎ عند 15 يومًا، ‎75%‎ عند 7 أيام، و‎100%‎ خلال آخر 7 أيام. تُطبَّق أيضًا شروط التأشيرة وشركات الطيران والفنادق.",
    kvkkTitle: "إشعار حماية البيانات والموافقة",
    kvkkBody:
      "تُعالَج بيانات الهوية وجواز السفر والاتصال والإقرار الصحي لتنفيذ هذا الحجز وإجراءات التأشيرة والإقامة، ولا تُشارك إلا مع الموردين والجهات الرسمية المعنية. تواصل مع الوكالة لممارسة حقوقك.",
    consent: "أوافق على معالجة بياناتي الشخصية ونقلها للأغراض المذكورة أعلاه.",
    customerSign: "توقيع العميل",
    agencySign: "ختم / توقيع الوكالة",
    voucherNote: "يرجى تقديم هذه القسيمة في الفندق ومكتب النقل.",
    ticketNote: "يرجى التواجد في المطار قبل 3 ساعات على الأقل. تخضع الأمتعة لشروط التذكرة.",
    proformaNote: "هذا المستند إشعار دفع وليس فاتورة ضريبية.",
    print: "طباعة / PDF",
    male: "ذكر",
    female: "أنثى",
  },
};

const SERVICE: Record<DocumentLang, Record<string, string>> = {
  tr: { flight: "Uçak", hotel: "Otel", package: "Hac / Umre", transfer: "Transfer", visa: "Vize", tour: "Tur" },
  en: { flight: "Flight", hotel: "Hotel", package: "Hajj / Umrah", transfer: "Transfer", visa: "Visa", tour: "Tour" },
  ar: { flight: "طيران", hotel: "فندق", package: "حج / عمرة", transfer: "نقل", visa: "تأشيرة", tour: "جولة" },
};

const STATUS: Record<DocumentLang, Record<string, string>> = {
  tr: {
    draft: "Taslak",
    quoted: "Teklif",
    option_hold: "Opsiyonlu",
    confirmed: "Onaylı",
    partially_paid: "Kısmi ödendi",
    ready: "Hazır",
    travelled: "Seyahat edildi",
    completed: "Tamamlandı",
    cancelled: "İptal",
  },
  en: {
    draft: "Draft",
    quoted: "Quoted",
    option_hold: "On option",
    confirmed: "Confirmed",
    partially_paid: "Partially paid",
    ready: "Ready",
    travelled: "Travelled",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  ar: {
    draft: "مسودة",
    quoted: "عرض سعر",
    option_hold: "حجز مبدئي",
    confirmed: "مؤكد",
    partially_paid: "مدفوع جزئيًا",
    ready: "جاهز",
    travelled: "سافر",
    completed: "مكتمل",
    cancelled: "ملغى",
  },
};

const SUPPLIER_BRANDS: Record<string, string> = {
  duffel: "Duffel",
  paximum: "Paximum",
  amadeus: "Amadeus",
  sabre: "Sabre",
  saadia: "Saadia",
  nusuk: "Nusuk",
};
const SUPPLIER_GENERIC: Record<DocumentLang, Record<string, string>> = {
  tr: { direct_contract: "Özel kontrat", other: "Diğer" },
  en: { direct_contract: "Private contract", other: "Other" },
  ar: { direct_contract: "عقد خاص", other: "أخرى" },
};

function supplierName(code: string, lang: DocumentLang): string {
  return SUPPLIER_BRANDS[code] ?? SUPPLIER_GENERIC[lang][code] ?? "";
}

const INTL_LOCALE: Record<DocumentLang, string> = { tr: "tr-TR", en: "en-GB", ar: "ar-SA-u-nu-latn" };

export function documentTitle(kind: DocumentKind, lang: DocumentLang): string {
  return DICT[lang][kind];
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(minor: number, currency: string, lang: DocumentLang): string {
  try {
    return new Intl.NumberFormat(INTL_LOCALE[lang], { style: "currency", currency: currency || "USD" }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

function day(value: string | null, lang: DocumentLang): string {
  if (!value) return "—";
  const t = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(t)) return value;
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], { dateStyle: "medium", timeZone: "UTC" }).format(t);
}

const e = escapeHtml;

function kv(label: string, value: string): string {
  return value && value !== "—" ? `<div class="kv"><span>${e(label)}</span><b>${e(value)}</b></div>` : "";
}

function leg(label: string, l: DocumentFlightLeg | null, lang: DocumentLang): string {
  if (!l || !(l.route || l.flightNo)) return "";
  return kv(label, [l.route, l.flightNo, l.date ? day(l.date, lang) : ""].filter(Boolean).join(" · "));
}

function travellersTable(d: DocumentData, t: Dict, lang: DocumentLang, withPassport: boolean): string {
  if (d.travellers.length === 0) return "";
  const rows = d.travellers
    .map(
      (p, i) =>
        `<tr><td>${i + 1}</td><td>${e(p.name)}</td><td>${e(p.gender === "male" ? t.male : p.gender === "female" ? t.female : "—")}</td>${
          withPassport ? `<td dir="ltr">${p.passportLast4 ? `••••${e(p.passportLast4)}` : "—"}</td>` : ""
        }<td>${e(day(p.dateOfBirth, lang))}</td></tr>`,
    )
    .join("");
  return `<section><h2>${e(t.travellers)}</h2><table><thead><tr><th>#</th><th>${e(t.name)}</th><th>${e(t.gender)}</th>${
    withPassport ? `<th>${e(t.passport)}</th>` : ""
  }<th>${e(t.dob)}</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function tripSection(d: DocumentData, t: Dict, lang: DocumentLang, flightsOnly: boolean): string {
  const flights = [kv(t.flights, d.airline), leg(t.outbound, d.outbound, lang), leg(t.inbound, d.inbound, lang)].join("");
  const stay = flightsOnly
    ? ""
    : [kv(t.makkah, d.makkahHotel), kv(t.madinah, d.madinahHotel), kv(t.transfer, d.busClass), kv(t.guide, d.guide)].join("");
  const dates = [kv(t.depart, day(d.departDate, lang)), kv(t.return, day(d.returnDate, lang))].join("");
  const body = [dates, flights, stay].join("");
  return body ? `<section><h2>${e(t.trip)}</h2><div class="grid">${body}</div></section>` : "";
}

function financeSection(d: DocumentData, t: Dict, lang: DocumentLang): string {
  const m = (v: number) => money(v, d.currency, lang);
  const rows = d.lines
    .map((l) => `<tr><td>${e(l.label)}</td><td class="num">${l.quantity}</td><td class="num">${e(m(l.unitPrice))}</td><td class="num">${e(m(l.total))}</td></tr>`)
    .join("");
  const subtotal = d.lines.reduce((s, l) => s + l.total, 0);
  const table = d.lines.length
    ? `<table><thead><tr><th>${e(t.item)}</th><th class="num">${e(t.qty)}</th><th class="num">${e(t.unit)}</th><th class="num">${e(t.amount)}</th></tr></thead><tbody>${rows}</tbody></table>`
    : "";
  const totals = [
    d.lines.length ? `<div class="kv"><span>${e(t.subtotal)}</span><b>${e(m(subtotal))}</b></div>` : "",
    d.discountAmt > 0 ? `<div class="kv"><span>${e(t.discount)}</span><b>−${e(m(d.discountAmt))}</b></div>` : "",
    `<div class="kv total"><span>${e(t.total)}</span><b>${e(m(d.totalAmount))}</b></div>`,
    `<div class="kv"><span>${e(t.paid)}</span><b>${e(m(d.collectedAmt))}</b></div>`,
    `<div class="kv strong"><span>${e(t.balance)}</span><b>${e(m(d.balanceAmt))}</b></div>`,
  ].join("");
  return `<section>${table}<div class="totals">${totals}</div></section>`;
}

const CSS = `
*{box-sizing:border-box}body{margin:0;background:#f4f4f5;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans Arabic",sans-serif;color:#18181b}
.page{max-width:820px;margin:24px auto;background:#fff;border-radius:24px;padding:40px;box-shadow:0 20px 60px -30px rgba(15,23,42,.35)}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:1px solid #e4e4e7;padding-bottom:20px}
.brand{display:flex;align-items:center;gap:14px}.brand img{max-height:56px;max-width:160px;object-fit:contain}.brand b{font-size:18px}
h1{margin:0;font-size:24px;letter-spacing:-.01em}.meta{text-align:end;color:#52525b;font-size:13px}.meta b{color:#18181b}
.pill{display:inline-block;margin-top:6px;padding:3px 10px;border-radius:999px;background:#eef2ff;color:#4338ca;font-weight:600;font-size:12px}
section{margin-top:24px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#71717a;margin:0 0 10px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}.kv{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px dashed #e4e4e7}
.kv span{color:#71717a}.kv b{font-weight:600;text-align:end}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:8px 10px;border-bottom:1px solid #f4f4f5;text-align:start}th{background:#fafafa;color:#52525b;font-weight:600}
.num{text-align:end;font-variant-numeric:tabular-nums}.totals{margin-inline-start:auto;max-width:320px;margin-top:12px}.total b{font-size:16px}.strong b{color:#be123c}
.note{margin-top:20px;padding:12px 16px;border-radius:14px;background:#f0fdf4;color:#166534;font-size:13px}
.legal p{color:#3f3f46;font-size:12.5px}.consent{display:flex;gap:10px;align-items:flex-start;margin-top:10px;font-size:12.5px}.box{width:16px;height:16px;border:1.5px solid #18181b;border-radius:4px;flex:none;margin-top:2px}
.signs{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:40px}.signs div{border-top:1px solid #18181b;padding-top:8px;color:#52525b;font-size:12px}
.toolbar{position:sticky;top:0;display:flex;justify-content:center;padding:12px}.toolbar button{border:0;border-radius:14px;background:#18181b;color:#fff;padding:10px 18px;font-weight:600;cursor:pointer}
@media print{body{background:#fff}.page{box-shadow:none;margin:0;border-radius:0;padding:24px}.toolbar{display:none}}
`;

/** Full HTML page for one document; every interpolated value is escaped. */
export function renderBookingDocument(kind: DocumentKind, lang: DocumentLang, d: DocumentData): string {
  const t = DICT[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const logo = d.company.logoUrl ? `<img src="${e(d.company.logoUrl)}" alt="">` : "";
  const header = `<header><div class="brand">${logo}<div><b>${e(d.company.name)}</b><h1>${e(t[kind])}</h1></div></div>
<div class="meta"><div>${e(t.ref)}: <b dir="ltr">${e(d.refCode || "—")}</b></div>${d.pnr ? `<div>${e(t.pnr)}: <b dir="ltr">${e(d.pnr)}</b></div>` : ""}<div>${e(t.issued)}: ${e(
    day(d.issuedAt, lang),
  )}</div><span class="pill">${e(STATUS[lang][d.status] ?? d.status)}</span></div></header>`;
  const party = `<section class="grid">${kv(t.customer, d.customer.name)}${kv(t.phone, d.customer.phone)}${kv(t.email, d.customer.email)}${kv(
    t.service,
    [SERVICE[lang][d.serviceType] ?? "", d.summary || d.packageName].filter(Boolean).join(" · "),
  )}${kv(t.supplier, supplierName(d.supplierSource, lang))}</section>`;

  let body = "";
  switch (kind) {
    case "voucher":
      body = tripSection(d, t, lang, false) + travellersTable(d, t, lang, false) + `<div class="note">${e(t.voucherNote)}</div>`;
      break;
    case "eticket":
      body = tripSection(d, t, lang, true) + travellersTable(d, t, lang, true) + `<div class="note">${e(t.ticketNote)}</div>`;
      break;
    case "proforma":
      body = financeSection(d, t, lang) + `<div class="note">${e(t.proformaNote)}</div>`;
      break;
    case "contract":
      body =
        tripSection(d, t, lang, false) +
        travellersTable(d, t, lang, true) +
        financeSection(d, t, lang) +
        `<section class="legal"><h2>${e(t.terms)}</h2><p>${e(t.termsBody)}</p><h2>${e(t.kvkkTitle)}</h2><p>${e(t.kvkkBody)}</p>
<div class="consent"><span class="box"></span><span>${e(t.consent)}</span></div></section>
<div class="signs"><div>${e(t.customerSign)}</div><div>${e(t.agencySign)}</div></div>`;
      break;
  }

  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(`${t[kind]} · ${d.refCode}`)}</title><style>${CSS}</style></head><body>
<div class="toolbar"><button type="button" data-print>${e(t.print)}</button></div>
<main class="page">${header}${party}${body}</main></body></html>`;
}
