// Keyboard support for the data-entry drawers, so a run of purchases or
// productions can be keyed in without reaching for the mouse.
//
// Three pieces, each solving a different way the keyboard used to break down:
//   * focusableWithin — what counts as "the next thing", used by both hooks
//   * useFocusTrap    — Tab stays inside an open drawer instead of wandering
//                       onto the page behind it
//   * useEnterAdvance — Enter moves to the next field rather than doing nothing

import { useEffect } from "react";

const FOCUSABLE = [
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "button",
  "a[href]",
  "[tabindex]",
].join(",");

const isFormField = (el) =>
  el && ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);

/**
 * Everything inside `root` the user can Tab to, in DOM order.
 *
 * Disabled and `tabindex="-1"` elements are skipped, as is anything not
 * rendered — a drawer that is closed but still mounted has a zero-size panel,
 * and its fields must not count as "next".
 */
export function focusableWithin(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => {
    if (el.disabled || el.getAttribute("tabindex") === "-1") return false;
    if (el.closest("[inert]")) return false;
    // offsetParent is null for display:none; the rect covers visibility and
    // zero-size wrappers.
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  });
}

/**
 * Keep Tab inside `containerRef` while `active`.
 *
 * A drawer is a fixed overlay, not a real modal, so without this Tab walks
 * straight out of it and onto the page underneath — where the focus ring is
 * invisible behind the scrim and the next Enter hits something unrelated.
 */
export function useFocusTrap(containerRef, active) {
  useEffect(() => {
    if (!active) return;
    function onKey(e) {
      if (e.key !== "Tab") return;
      const root = containerRef.current;
      if (!root) return;
      const items = focusableWithin(root);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const el = document.activeElement;
      const inside = root.contains(el);
      if (e.shiftKey && (el === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (el === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [containerRef, active]);
}

/**
 * An onKeyDown handler that makes Enter move to the next field.
 *
 * Returns a handler to spread onto the drawer panel. Rules, in order:
 *   * textareas keep Enter for newlines;
 *   * buttons keep Enter for activating themselves, so the submit button still
 *     submits — deliberately, Enter never auto-saves from a field;
 *   * a control that handled Enter itself (a combobox picking an option) has
 *     already called stopPropagation, so this never sees it;
 *   * otherwise focus jumps to the next *field*, skipping the row-delete and
 *     add-item buttons that sit between them;
 *   * past the last field, focus lands on the submit button. A second Enter
 *     saves, which keeps a deliberate beat before anything is written.
 */
export function useEnterAdvance(containerRef) {
  return function onKeyDown(e) {
    if (e.key !== "Enter" || e.defaultPrevented) return;
    const el = e.target;
    if (!isFormField(el)) return;
    if (el.tagName === "TEXTAREA") return;

    const root = containerRef.current;
    if (!root) return;

    e.preventDefault();
    const items = focusableWithin(root);
    const idx = items.indexOf(el);
    const next = items.slice(idx + 1).find(isFormField);
    if (next) {
      next.focus();
      if (next.select) next.select();
      return;
    }
    root.querySelector("button[type='submit']")?.focus();
  };
}
