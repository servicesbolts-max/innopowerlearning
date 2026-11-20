import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during server rendering and prerendering, true after hydration. Components that depend on
 * the current time (calendars mark "today") render only on the client, so prerendered HTML never
 * bakes in a stale date and Cache Components does not see `new Date()` during prerender.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
