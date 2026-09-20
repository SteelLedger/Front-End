// Manual stock corrections, matching the /stock-adjustments API contract.
//
// The same body serves both inventories — POST /raw-materials/{id}/
// stock-adjustments and POST /products/{id}/stock-adjustments:
//
//   { direction: "add" | "reduce", date: "DD/MM/YYYY", quantity, details }
//
// All four are required. `quantity` goes over the wire in GRAMS and is ALWAYS
// POSITIVE — `direction` is what carries the sign — while the form, like every
// other quantity field in the app, is in kg.

import { todayISO, isoToDMY } from "./party";
import { kgToGm, gmToKgDisplay } from "./units";

/** The API's enum, plus how each side reads on screen. */
export const DIRECTIONS = [
  { value: "add", label: "Add Stock" },
  { value: "reduce", label: "Reduce Stock" },
];

/** The API caps the reason at 1000 characters. */
export const DETAILS_MAX = 1000;

export function emptyAdjustmentForm() {
  return {
    direction: "add",
    date: todayISO(),
    quantity: "", // kg; converted on save
    details: "",
    error: "",
    errorFields: [],
  };
}

const text = (v) => String(v ?? "").trim();

/**
 * What this adjustment would leave on hand, in grams. Only meaningful for a
 * reduce, where the backend refuses to go below zero.
 */
export function resultingQtyGm(form, currentQtyGm = 0) {
  const delta = kgToGm(form.quantity || 0);
  return form.direction === "reduce"
    ? Number(currentQtyGm) - delta
    : Number(currentQtyGm) + delta;
}

/**
 * First problem with the form, as { message, field }, or null when it's good.
 *
 * The over-reduction check is a courtesy: the API refuses it too (400), but
 * saying so before the round trip — and naming the amount actually available —
 * is friendlier than bouncing the user off a server error.
 */
export function validateAdjustment(form, currentQtyGm = 0) {
  if (!text(form.date)) {
    return { message: "Pick the date this adjustment applies to.", field: "date" };
  }
  if (text(form.quantity) === "") {
    return { message: "Enter a quantity.", field: "quantity" };
  }
  if (!(Number(form.quantity) > 0)) {
    return { message: "Quantity must be greater than 0.", field: "quantity" };
  }
  if (form.direction === "reduce" && resultingQtyGm(form, currentQtyGm) < 0) {
    return {
      message: `Only ${gmToKgDisplay(currentQtyGm)} kg is on hand — you can't reduce by more than that.`,
      field: "quantity",
    };
  }
  if (!text(form.details)) {
    return {
      message: "Add a short reason so this correction can be traced later.",
      field: "details",
    };
  }
  if (text(form.details).length > DETAILS_MAX) {
    return {
      message: `Keep the reason under ${DETAILS_MAX} characters.`,
      field: "details",
    };
  }
  return null;
}

/** Form -> POST body. kg becomes grams; the date becomes DD/MM/YYYY. */
export function buildAdjustmentPayload(form) {
  return {
    direction: form.direction,
    date: isoToDMY(form.date),
    quantity: kgToGm(form.quantity),
    details: text(form.details),
  };
}
