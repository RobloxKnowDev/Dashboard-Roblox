import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false on the server and during hydration, true once mounted in the browser.
 * Used to render browser-only widgets (charts measure their container and
 * their library generates non-deterministic ids, which prerendering forbids).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
