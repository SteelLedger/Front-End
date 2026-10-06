import { createContext, useContext } from "react";

/**
 * System-wide maintenance status, from the public GET /maintenance/status.
 * Provided by components/MaintenanceProvider, which blocks the app while it's
 * on; Settings reads the same value to display it.
 */
export const MaintenanceContext = createContext({
  isEnabled: false,
  message: "",
  enabledAt: null,
  checking: false,
  unavailable: false,
  refresh: () => {},
});

/** Read the maintenance status. */
export function useMaintenance() {
  return useContext(MaintenanceContext);
}
