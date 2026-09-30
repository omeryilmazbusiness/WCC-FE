import type { LeadDraft } from "@/entities/ai";
import type { Lead, TripInterest } from "@/entities/lead";
import type { Conversation } from "@/entities/conversation";
import type { LeadPrefill } from "@/features/create-lead";

/** Names the backend gives a lead it opened for an unknown sender. */
const PLACEHOLDER_NAMES = new Set(["", "unknown contact"]);

function draftInterest(d: LeadDraft): TripInterest {
  return {
    travelDate: d.travelDate || null,
    travelWindow: d.travelWindow,
    paxCount: d.paxCount,
    budgetAmount: d.budgetAmount,
    budgetCurrency: d.budgetCurrency,
    packageId: d.packageId,
    packageInterest: d.packageInterest,
  };
}

/** Prefill for a new lead: the contact from the channel, the rest from AI. */
export function prefillFromDraft(conv: Conversation, d: LeadDraft): LeadPrefill {
  return {
    fullName: d.fullName || conv.contactName,
    phone: d.phone || conv.contactPhone,
    source: conv.channel,
    notes: d.notes,
    interest: draftInterest(d),
  };
}

/** Prefill without AI: only what the channel knows about the sender. */
export function prefillFromContact(conv: Conversation): LeadPrefill {
  return {
    fullName: conv.contactName || conv.customerName,
    phone: conv.contactPhone,
    source: conv.channel,
  };
}

/**
 * Prefill for completing an existing lead: fields the model filled replace
 * the lead's values, everything else keeps what the team already entered.
 * AI notes are appended, never replace notes.
 */
export function mergeDraftIntoLead(lead: Lead, d: LeadDraft): LeadPrefill {
  const ai = new Set(d.aiFields);
  const i = lead.interest;
  const pick = <T,>(field: string, fromDraft: T, current: T): T => (ai.has(field) ? fromDraft : current);
  const placeholder = PLACEHOLDER_NAMES.has(lead.fullName.trim().toLowerCase());
  const notes =
    ai.has("notes") && d.notes && !lead.notes.includes(d.notes)
      ? [lead.notes.trim(), d.notes].filter(Boolean).join("\n")
      : lead.notes;
  const budgetFromDraft = ai.has("budget_amount");
  const packageFromDraft = ai.has("package_id");
  return {
    fullName: ai.has("full_name") || (placeholder && d.fullName) ? d.fullName : lead.fullName,
    phone: lead.phone,
    notes,
    interest: {
      travelDate: pick("travel_date", d.travelDate || null, i.travelDate),
      travelWindow: pick("travel_window", d.travelWindow, i.travelWindow),
      paxCount: pick("pax_count", d.paxCount, i.paxCount),
      budgetAmount: budgetFromDraft ? d.budgetAmount : i.budgetAmount,
      budgetCurrency: budgetFromDraft ? d.budgetCurrency : i.budgetCurrency,
      packageId: packageFromDraft ? d.packageId : i.packageId,
      packageInterest: packageFromDraft ? "" : pick("package_interest", d.packageInterest, i.packageInterest),
    },
  };
}
