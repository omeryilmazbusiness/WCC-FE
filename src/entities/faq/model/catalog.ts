import type { GuardedRoute } from "@/shared/config/permissions";
import { routes } from "@/shared/config/routes";

/**
 * Help topics in display order. Copy lives in `faq.topics.<id>` (title, summary) and
 * `faq.topics.<id>.items.<question>` (q, a) for every locale; this list only fixes
 * which entries exist, their order and the screen each topic explains.
 */
export type FaqTopic = {
  id: string;
  /** Screen the topic is about; the topic is hidden from viewers who cannot open it. */
  route?: GuardedRoute | typeof routes.security;
  questions: readonly string[];
};

export const FAQ_TOPICS = [
  { id: "gettingStarted", questions: ["signIn", "navigation", "favorites", "branch", "language", "search", "signOut"] },
  { id: "account", route: routes.security, questions: ["profile", "password", "twoFactor", "recovery", "sessions"] },
  { id: "manager", route: routes.manager, questions: ["overview", "revenue", "attention", "team", "period"] },
  { id: "workspace", route: routes.workspace, questions: ["overview", "queue", "pipeline", "target"] },
  { id: "tasks", route: routes.tasks, questions: ["create", "priority", "assign", "bulk", "sources", "overdue"] },
  { id: "notifications", route: routes.notifications, questions: ["what", "states", "live", "channels", "rules"] },
  { id: "pipeline", route: routes.pipeline, questions: ["create", "stages", "views", "lost", "convert", "fields"] },
  { id: "inbox", route: routes.inbox, questions: ["connect", "reply", "assign", "lead", "aiDraft", "noMessages"] },
  { id: "customers", route: routes.customers, questions: ["create", "documents", "duplicates", "merge", "family", "history"] },
  { id: "targets", route: routes.targets, questions: ["create", "measure", "seasonality", "shares", "delete"] },
  { id: "packages", route: routes.packages, questions: ["create", "pricing", "departures", "clone", "requirements", "itinerary"] },
  { id: "bookings", route: routes.bookings, questions: ["create", "travellers", "confirm", "override", "payments", "documents", "cancel"] },
  { id: "flights", route: routes.flights, questions: ["search", "results", "book", "unavailable"] },
  { id: "hotels", route: routes.hotels, questions: ["create", "seasons", "markup", "children", "allotment"] },
  { id: "suppliers", route: routes.suppliers, questions: ["create", "health", "ledger", "invoices", "disputes", "contract"] },
  { id: "missingDocs", route: routes.missingDocs, questions: ["what", "use", "allClear"] },
  { id: "finance", route: routes.finance, questions: ["overview", "treasury", "receivables", "payables", "profit", "recon", "queues"] },
  { id: "fxRates", route: routes.financeFx, questions: ["what", "add", "live", "missing", "converter"] },
  { id: "reports", route: routes.reports, questions: ["which", "period", "export", "empty"] },
  { id: "importExport", route: routes.importExport, questions: ["import", "matching", "review", "templates", "export", "history"] },
  { id: "aiSetup", route: routes.aiSetup, questions: ["what", "connect", "features", "security"] },
  { id: "setup", route: routes.setup, questions: ["what", "steps", "later", "language"] },
  { id: "team", route: routes.team, questions: ["add", "roles", "reset", "deactivate", "unlock", "sessions"] },
  { id: "settings", route: routes.adminSettings, questions: ["what", "roles", "audit", "export"] },
  { id: "companies", route: routes.adminCompanies, questions: ["create", "gm", "manage"] },
  { id: "privacy", questions: ["masking", "anonymize", "audit", "encryption"] },
] as const satisfies readonly FaqTopic[];

export type FaqTopicId = (typeof FAQ_TOPICS)[number]["id"];
