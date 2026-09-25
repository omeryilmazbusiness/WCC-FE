/**
 * ISP: dismiss persistence for first-run wizard (per branch).
 * localStorage adapter — swap for server prefs later without touching UI.
 */

export type SetupDismissStore = {
  isDismissed(branchId: string): boolean;
  dismiss(branchId: string): void;
  clear(branchId: string): void;
};

const PREFIX = "wcc.branchSetup.dismissed.";

export function createLocalSetupDismissStore(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null,
): SetupDismissStore {
  return {
    isDismissed(branchId: string) {
      if (!storage || !branchId) return false;
      return storage.getItem(PREFIX + branchId) === "1";
    },
    dismiss(branchId: string) {
      if (!storage || !branchId) return;
      storage.setItem(PREFIX + branchId, "1");
    },
    clear(branchId: string) {
      if (!storage || !branchId) return;
      storage.removeItem(PREFIX + branchId);
    },
  };
}

export function browserSetupDismissStore(): SetupDismissStore {
  if (typeof window === "undefined") {
    return createLocalSetupDismissStore(null);
  }
  return createLocalSetupDismissStore(window.localStorage);
}
