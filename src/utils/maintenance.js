// While maintenance is on, every endpoint except /maintenance/* answers 503.
// The axios interceptor reports those here and MaintenanceProvider listens, so
// a 503 from any screen swaps the app for the maintenance notice — not only
// the status check it runs on load.

const listeners = new Set();

/** Subscribe to 503s. Returns the unsubscribe function. */
export function onServiceUnavailable(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Tell the listeners an API answered 503. Returns whether anyone was
 * listening — i.e. whether the maintenance notice will take over the screen.
 */
export function reportServiceUnavailable() {
  listeners.forEach((fn) => fn());
  return listeners.size > 0;
}
