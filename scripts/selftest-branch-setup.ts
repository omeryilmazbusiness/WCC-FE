/**
 * Self-test: GM branch first-setup pure rules + dismiss store.
 * Run: npm run test:branch-setup
 */

import assert from "node:assert/strict";
import {
  branchSetupProgress,
  canSeeBranchSetupWizard,
  initialBranchSetupStep,
  isAiReady,
  isBranchSetupComplete,
  isChannelsReady,
  isOrgReady,
  missingOrgRoles,
  nextBranchSetupStep,
  prevBranchSetupStep,
  shouldShowBranchSetupWizard,
  ORG_SEED_ROLES,
} from "../src/features/branch-setup/model/setup-status.ts";
import { createLocalSetupDismissStore } from "../src/features/branch-setup/model/dismiss-store.ts";

function memStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(k: string) {
      return map.has(k) ? map.get(k)! : null;
    },
    setItem(k: string, v: string) {
      map.set(k, String(v));
    },
    removeItem(k: string) {
      map.delete(k);
    },
    key() {
      return null;
    },
  } as Storage;
}

function base(over: Partial<Parameters<typeof shouldShowBranchSetupWizard>[0]> = {}) {
  return {
    companyNamed: false,
    staffRolesPresent: [] as string[],
    aiConfigured: false,
    aiEnabled: false,
    channelsConnected: 0,
    dismissed: false,
    ...over,
  };
}

function run() {
  assert.equal(canSeeBranchSetupWizard("gm"), true);
  assert.equal(canSeeBranchSetupWizard("manager"), false);
  assert.equal(canSeeBranchSetupWizard("admin"), false);

  assert.equal(ORG_SEED_ROLES.length, 4);
  assert.equal(isOrgReady({ companyNamed: false, staffRolesPresent: ORG_SEED_ROLES }), false);
  assert.equal(
    isOrgReady({
      companyNamed: true,
      staffRolesPresent: ["manager", "employee"],
    }),
    false,
  );
  assert.deepEqual(missingOrgRoles(["manager"]), [
    "employee",
    "finance",
    "operations",
  ]);
  assert.equal(
    isOrgReady({ companyNamed: true, staffRolesPresent: [...ORG_SEED_ROLES] }),
    true,
  );

  assert.equal(isAiReady({ aiConfigured: true, aiEnabled: true }), true);
  assert.equal(isChannelsReady({ channelsConnected: 1 }), true);

  const incomplete = base();
  assert.equal(shouldShowBranchSetupWizard(incomplete), true);
  assert.equal(initialBranchSetupStep(incomplete), "org");

  const orgDone = base({
    companyNamed: true,
    staffRolesPresent: [...ORG_SEED_ROLES],
  });
  assert.equal(initialBranchSetupStep(orgDone), "ai");

  const aiDone = base({
    companyNamed: true,
    staffRolesPresent: [...ORG_SEED_ROLES],
    aiConfigured: true,
    aiEnabled: true,
  });
  assert.equal(initialBranchSetupStep(aiDone), "channels");

  const done = base({
    companyNamed: true,
    staffRolesPresent: [...ORG_SEED_ROLES],
    aiConfigured: true,
    aiEnabled: true,
    channelsConnected: 1,
  });
  assert.equal(isBranchSetupComplete(done), true);
  assert.equal(shouldShowBranchSetupWizard(done), false);
  assert.equal(shouldShowBranchSetupWizard({ ...done, forceOpen: true }), true);
  assert.equal(shouldShowBranchSetupWizard({ ...incomplete, dismissed: true }), false);

  assert.equal(nextBranchSetupStep("org"), "ai");
  assert.equal(nextBranchSetupStep("ai"), "channels");
  assert.equal(nextBranchSetupStep("channels"), null);
  assert.equal(prevBranchSetupStep("ai"), "org");

  const prog = branchSetupProgress(orgDone);
  assert.equal(prog.done, 1);
  assert.equal(prog.total, 3);

  const store = createLocalSetupDismissStore(memStorage());
  const bid = "11111111-1111-1111-1111-111111111111";
  store.dismiss(bid);
  assert.equal(store.isDismissed(bid), true);
  store.clear(bid);
  assert.equal(store.isDismissed(bid), false);

  console.log("selftest-branch-setup: OK");
}

run();
