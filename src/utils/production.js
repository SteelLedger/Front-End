// Production helpers, matching the /productions API contract.

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
];

export const productionTypeLabel = (value) =>
  PRODUCTION_TYPES.find((t) => t.value === value)?.label || "—";
