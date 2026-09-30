import { routes } from "@/shared/config/routes";
import type { AttentionItem } from "../model";

/**
 * Where an attention row should take the user. Bookings and packages open the
 * record itself; kinds without a detail page open the list that owns them.
 */
export function attentionHref(item: Pick<AttentionItem, "kind" | "linkType" | "linkId">): string {
  switch (item.linkType) {
    case "booking":
      return item.linkId ? routes.booking(item.linkId) : routes.bookings;
    case "package":
      return item.linkId ? routes.package(item.linkId) : routes.packages;
    case "lead":
      return routes.pipeline;
    case "conversation":
      return routes.inbox;
    case "revenue_target":
      return routes.targets;
    default:
      return item.kind === "missing_doc" ? routes.missingDocs : routes.tasks;
  }
}
