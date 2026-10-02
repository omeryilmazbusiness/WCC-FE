import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during SSR and hydration, true afterwards. Gate output that depends on the
 * browser's clock, timezone or ICU data so the server HTML always matches.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
