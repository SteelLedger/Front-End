import { createContext, useContext, useEffect, useRef } from "react";

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
 * @param {boolean}  [config.dateFilter]    Show the period + range chips.
 * @param {string}   [config.defaultPeriod] Preset the filter opens on.
 * @param {Function} [config.onDateChange]  Receives { fromDate, toDate, from, to }.
 */
export function usePageHeader({
  actionLabel,
  onAction,
  dateFilter = false,
  defaultPeriod = "all",
  onDateChange,
} = {}) {
  const setHeader = useContext(PageHeaderContext);
  const handlers = useRef({ onAction, onDateChange });

  // Keep the latest callbacks reachable without making them effect deps.
  useEffect(() => {
    handlers.current = { onAction, onDateChange };
  });

  useEffect(() => {
    setHeader({
      actionLabel,
      dateFilter,
      defaultPeriod,
      onAction: onAction ? (...args) => handlers.current.onAction?.(...args) : undefined,
      onDateChange: (...args) => handlers.current.onDateChange?.(...args),
    });
    return () => setHeader({});
    // Only primitives here — the callbacks go through the ref above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader, actionLabel, dateFilter, defaultPeriod, !!onAction]);
}
