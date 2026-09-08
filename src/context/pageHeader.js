import { createContext, useContext, useEffect, useRef } from "react";
import { DEFAULT_PERIOD } from "../utils/dateRange";

/**
 * Lets the page currently in the <Outlet/> put its own controls in the topbar:
 * its date filter and its primary action. Without this each page kept a header
 * row of its own, which left an empty band once the titles moved to the topbar.
 *
 * Layout provides the setter; pages register through `usePageHeader`.
 */
export const PageHeaderContext = createContext(() => {});

/**
 * Register this page's topbar controls. Callbacks are held in a ref and called
 * through a stable wrapper, so a page can pass inline arrow functions without
 * the effect re-firing on every render.
 *
 * @param {object}   config
 * @param {string}   [config.actionLabel]   Button text; falls back to "New Sale".
 * @param {Function} [config.onAction]      Click handler for that button.
 * @param {string}   [config.secondaryLabel] Text for an outlined button placed
 *                                          before the primary one.
 * @param {Function} [config.onSecondary]   Click handler for that button.
 * @param {boolean}  [config.dateFilter]    Show the period + range chips.
 * @param {string}   [config.defaultPeriod] Preset the filter opens on;
 *                                          defaults to the current month.
 * @param {Function} [config.onDateChange]  Receives { fromDate, toDate, from, to }.
 */
export function usePageHeader({
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  dateFilter = false,
  defaultPeriod = DEFAULT_PERIOD,
  onDateChange,
} = {}) {
  const setHeader = useContext(PageHeaderContext);
  const handlers = useRef({ onAction, onSecondary, onDateChange });
  // Only whether a handler exists matters to the effect — its identity is read
  // through the ref, so a fresh inline arrow each render must not re-fire it.
  const hasAction = !!onAction;
  const hasSecondary = !!onSecondary;

  // Keep the latest callbacks reachable without making them effect deps.
  useEffect(() => {
    handlers.current = { onAction, onSecondary, onDateChange };
  });

  useEffect(() => {
    setHeader({
      actionLabel,
      secondaryLabel,
      dateFilter,
      defaultPeriod,
      onAction: onAction
        ? (...args) => handlers.current.onAction?.(...args)
        : undefined,
      onSecondary: onSecondary
        ? (...args) => handlers.current.onSecondary?.(...args)
        : undefined,
      onDateChange: (...args) => handlers.current.onDateChange?.(...args),
    });
    return () => setHeader({});
    // Only primitives here — the callbacks go through the ref above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    setHeader,
    actionLabel,
    secondaryLabel,
    dateFilter,
    defaultPeriod,
    hasAction,
    hasSecondary,
  ]);
}
