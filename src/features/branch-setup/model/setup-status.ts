/**
 * Pure GM first-setup rules (SRP / no I/O).
 * Step 1 org (company + staff) → 2 AI → 3 channels.
 */

import type { AppRole } from "@/shared/config/routes";

/** Staff roles GM seeds on first install (all departments). */
export const ORG_SEED_ROLES = [
  "manager",
  "employee",
  "finance",
  "operations",
] as const;

export type OrgSeedRole = (typeof ORG_SEED_ROLES)[number];

/** Suggested emails / names for first-run seeding (GM fills password). */
export const ORG_ROLE_DEFAULTS: Record<
  OrgSeedRole,
  { email: string; fullName: string }
> = {
  manager: { email: "manager@wodi.local", fullName: "Branch Manager" },
  employee: { email: "sales@wodi.local", fullName: "Sales Employee" },
  finance: { email: "finance@wodi.local", fullName: "Finance" },
  operations: { email: "ops@wodi.local", fullName: "Operations" },
};

export type BranchSetupFacts = {
  companyNamed: boolean;
  staffRolesPresent: readonly string[];
  aiConfigured: boolean;
  aiEnabled: boolean;
  channelsConnected: number;
  dismissed: boolean;
  forceOpen?: boolean;
};

export type BranchSetupStep = "org" | "ai" | "channels";

export const BRANCH_SETUP_STEPS: readonly BranchSetupStep[] = [
  "org",
  "ai",
  "channels",
] as const;

export function canSeeBranchSetupWizard(role: AppRole): boolean {
  return role === "gm";
}

export function isOrgReady(
  facts: Pick<BranchSetupFacts, "companyNamed" | "staffRolesPresent">,
): boolean {
  if (!facts.companyNamed) return false;
  const present = new Set(facts.staffRolesPresent);
  return ORG_SEED_ROLES.every((r) => present.has(r));
}

export function missingOrgRoles(
  staffRolesPresent: readonly string[],
): OrgSeedRole[] {
  const present = new Set(staffRolesPresent);
  return ORG_SEED_ROLES.filter((r) => !present.has(r));
}

export function isAiReady(
  facts: Pick<BranchSetupFacts, "aiConfigured" | "aiEnabled">,
): boolean {
  return Boolean(facts.aiConfigured && facts.aiEnabled);
}

export function isChannelsReady(
  facts: Pick<BranchSetupFacts, "channelsConnected">,
): boolean {
  return facts.channelsConnected > 0;
}

export function isBranchSetupComplete(facts: BranchSetupFacts): boolean {
  return isOrgReady(facts) && isAiReady(facts) && isChannelsReady(facts);
}

export function shouldShowBranchSetupWizard(facts: BranchSetupFacts): boolean {
  if (facts.forceOpen) return true;
  if (facts.dismissed) return false;
  return !isBranchSetupComplete(facts);
}

export function initialBranchSetupStep(
  facts: BranchSetupFacts,
): BranchSetupStep {
  if (!isOrgReady(facts)) return "org";
  if (!isAiReady(facts)) return "ai";
  return "channels";
}

export function nextBranchSetupStep(
  step: BranchSetupStep,
): BranchSetupStep | null {
  const i = BRANCH_SETUP_STEPS.indexOf(step);
  if (i < 0 || i >= BRANCH_SETUP_STEPS.length - 1) return null;
  return BRANCH_SETUP_STEPS[i + 1] ?? null;
}

export function prevBranchSetupStep(
  step: BranchSetupStep,
): BranchSetupStep | null {
  const i = BRANCH_SETUP_STEPS.indexOf(step);
  if (i <= 0) return null;
  return BRANCH_SETUP_STEPS[i - 1] ?? null;
}

export function branchSetupProgress(facts: BranchSetupFacts): {
  done: number;
  total: number;
  percent: number;
} {
  const total = BRANCH_SETUP_STEPS.length;
  let done = 0;
  if (isOrgReady(facts)) done += 1;
  if (isAiReady(facts)) done += 1;
  if (isChannelsReady(facts)) done += 1;
  return {
    done,
    total,
    percent: Math.round((done / total) * 100),
  };
}

export function isStepComplete(
  step: BranchSetupStep,
  facts: BranchSetupFacts,
): boolean {
  if (step === "org") return isOrgReady(facts);
  if (step === "ai") return isAiReady(facts);
  return isChannelsReady(facts);
}
