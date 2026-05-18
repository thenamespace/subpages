export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel: () => void;
}

/**
 * Minimal typed debounce. Replaces the `lodash` dependency (previously pulled
 * in only for `debounce`) and exposes `cancel()` so callers can clear pending
 * invocations on unmount and avoid running stale closures.
 */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, waitMs);
  };

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}
