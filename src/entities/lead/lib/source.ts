export const LEAD_SOURCE_KINDS = [
  "whatsapp",
  "instagram",
  "facebook",
  "web",
  "email",
  "phone",
  "referral",
  "walkin",
  "other",
] as const;

export type LeadSourceKind = (typeof LEAD_SOURCE_KINDS)[number];

const MATCHERS: [LeadSourceKind, RegExp][] = [
  ["whatsapp", /whats\s*app|\bwa\b|واتس/i],
  ["instagram", /insta|\big\b|انستغرام|إنستغرام/i],
  ["facebook", /face\s*book|\bfb\b|\bmeta\b|messenger|فيسبوك/i],
  ["email", /e-?mail|\bmail\b|بريد/i],
  ["phone", /phone|\bcall|\btel\b|hotline|هاتف|اتصال|مكالمة/i],
  ["referral", /refer|friend|partner|agent|إحالة|صديق/i],
  ["walkin", /walk|office|branch|store|visit|زيارة|مكتب|فرع/i],
  ["web", /web|site|online|google|\bseo\b|\bads?\b|\bform\b|landing|موقع/i],
];

/**
 * Channels offered as one-tap choices when a lead is created. `value` is what
 * is stored (the source stays free text); each maps back to its kind.
 */
export const LEAD_SOURCE_PRESETS = [
  { id: "web_widget", value: "Web widget" },
  { id: "whatsapp", value: "WhatsApp" },
  { id: "instagram", value: "Instagram" },
  { id: "meta_ads", value: "Meta ads" },
  { id: "google_ads", value: "Google ads" },
  { id: "referral", value: "Referral" },
  { id: "phone", value: "Phone" },
  { id: "email", value: "Email" },
  { id: "walkin", value: "Walk-in" },
] as const;

export type LeadSourcePreset = (typeof LEAD_SOURCE_PRESETS)[number];

/** Groups the free-text lead source into a known channel so it can get an icon and label. */
export function leadSourceKind(source: string | null | undefined): LeadSourceKind {
  const text = source?.trim() ?? "";
  if (!text) return "other";
  for (const [kind, re] of MATCHERS) if (re.test(text)) return kind;
  return "other";
}
