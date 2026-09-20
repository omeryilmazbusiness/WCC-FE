import { routes } from "@/shared/config/routes";

export type RelatedRef = {
  relatedType: string;
  relatedId: string;
  customerId?: string | null;
};

/** Deep-link related CRM/ops records from a task context (OCP: extend via switch). */
export function hrefForRelated(ref: RelatedRef): string {
  switch (ref.relatedType) {
    case "customer":
      return routes.customer(ref.relatedId);
    case "booking":
      return ref.customerId
        ? routes.customer(ref.customerId)
        : routes.customers;
    case "lead":
      return routes.pipeline;
    case "departure":
    case "package":
      return routes.packages;
    default:
      return routes.tasks;
  }
}
