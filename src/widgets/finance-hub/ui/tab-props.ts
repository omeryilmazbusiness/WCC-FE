import type { FinanceRepository } from "@/entities/finance";

export type FinanceTabProps = {
  repository: FinanceRepository;
  /** A mutation in the tab may have moved the executive overview. */
  onChanged?: () => void;
};
