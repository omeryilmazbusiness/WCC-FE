export type SetupStepKey = "company" | "staff" | "ai" | "channels";

/** Fixed onboarding order; mirrors `internal/domain/setup.Steps`. */
export const SETUP_STEPS: readonly SetupStepKey[] = ["company", "staff", "ai", "channels"];

export type SetupStepStatus = "pending" | "done" | "skipped";

export type SetupStep = {
  key: SetupStepKey;
  status: SetupStepStatus;
  /** Staff profiles or connected channels, depending on the step. */
  count: number;
};

export type CompanyProfile = {
  /** URL segment in `/{locale}/{slug}/{branch}/...`. */
  slug: string;
  nameEn: string;
  nameAr: string;
  legalName: string;
  phone: string;
  email: string;
  website: string;
  country: string;
  city: string;
  address: string;
  currency: string;
  timezone: string;
};

export type SetupBranchKind = "main_center" | "branch";

export type SetupBranch = {
  id: string;
  slug: string;
  code: string;
  nameEn: string;
  nameAr: string;
  kind: SetupBranchKind;
};

export type SetupOverview = {
  companyId: string;
  company: CompanyProfile;
  /** Every branch of the company, main center first. */
  branches: SetupBranch[];
  steps: SetupStep[];
  nextStep: SetupStepKey | null;
  doneCount: number;
  totalSteps: number;
  completed: boolean;
  /** Every step done (none skipped); the dashboard card shows until then. */
  fullyDone: boolean;
  /** GM should land on `/setup` after sign-in. */
  required: boolean;
  completedAt: string | null;
  dismissedAt: string | null;
};
