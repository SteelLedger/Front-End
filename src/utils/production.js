// Production helpers, matching the /productions API contract.

import { todayISO } from "./party";

/**
 * How many lines a run was cut on. The API's enum — `value` on the wire,
 * `label` on screen — and REQUIRED on POST /productions alongside
 * `rawMaterialId` and `productionDate`. The backend stores it on the
 * production record only: it doesn't affect any stock figure.
 *
 * `Production.productionType` is nullable, so runs recorded before the field
 * existed come back without one.
 */
export const PRODUCTION_TYPES = [
  { value: "single_line", label: "Single Line" },
  { value: "double_line", label: "Double Line" },
  { value: "triple_line", label: "Triple Line" },
  { value: "out", label: "Out" },
];

export const productionTypeLabel = (value) =>
  PRODUCTION_TYPES.find((t) => t.value === value)?.label || "—";

/* --------------------------- drawer form entries --------------------------- */

export const emptyByproduct = () => ({ name: "", customName: "", qty: "" });
export const emptyBalancePatta = () => ({ size: "", qty: "" }); // qty in kg

let entrySeq = 0;

/**
 * One product in the drawer — a complete production of its own, with its own
 * sheet, type and date, saved as its own record. All weights are kg — the page
 * converts to grams on save. `key` is React's alone and never goes over the
 * wire.
 */
export function emptyProductionEntry(overrides = {}) {
  entrySeq += 1;
  return {
    key: `entry-${entrySeq}`,
    rawMaterialId: "",
    // Required by the API, and left unset on purpose — a run is genuinely
    // single, double or triple line, so defaulting would quietly record a
    // guess. The drawer blocks submit until it's chosen.
    productionType: "",
    productionDate: todayISO(),
    productSize: "",
    howMany: "", // kg -> productQty
    productBundles: "", // a count, not a weight
    wasteQty: "", // kg -> wasteQty (scrap; deducted and gone)
    // Offcuts that return to raw-material stock at a new size — NOT waste.
    balancePattas: [emptyBalancePatta()],
    byproducts: [emptyByproduct()],
    // Whether the waste / balance patta / byproduct section is open.
    expanded: false,
    ...overrides,
  };
}

const typed = (v) => String(v ?? "").trim() !== "";

/**
 * Nothing chosen or typed anywhere on the entry — a card added and never
 * filled in. The date doesn't count: it starts on today. Blank cards are
 * dropped on save rather than blocking it.
 */
export function isBlankEntry(e = {}) {
  return (
    !e.rawMaterialId &&
    !e.productionType &&
    !typed(e.productSize) &&
    !typed(e.howMany) &&
    !typed(e.productBundles) &&
    !typed(e.wasteQty) &&
    (e.balancePattas || []).every((b) => !typed(b.size) && !typed(b.qty)) &&
    (e.byproducts || []).every(
      (b) => !b.name && !typed(b.customName) && !typed(b.qty),
    )
  );
}
