// Small string helpers shared across forms: building user-facing sentences out
// of a variable list of field names, and sanitising numeric text input.

/**
 * ["size"]                        -> "size"
 * ["size", "quantity"]            -> "size and quantity"
 * ["size", "quantity", "bundles"] -> "size, quantity and bundles"
 */
export function joinWithAnd(items = []) {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/** Capitalise the first letter, leaving the rest of the string alone. */
export const sentenceCase = (s = "") =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

/**
 * Keep only what can spell a decimal number — digits and a single point.
 *
 * Sizes are measurements ("10.5"), unlike point and grade which are labels
 * ("120p", "M5"); filtering them all as alphanumeric silently turned a typed
 * "10.5" into "105". Partial input is preserved, so "10." and ".5" survive
 * long enough for the user to finish typing.
 */
export function decimalInput(v) {
  const cleaned = String(v ?? "").replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length ? `${whole}.${rest.join("")}` : whole;
}

/**
 * A numeric string tidied for the wire: "10." -> "10", "10.50" -> "10.5",
 * "007" -> "7". Anything that isn't a number is passed through untouched, so
 * validation stays the thing that rejects it rather than this quietly
 * producing "NaN".
 */
export function numericText(v) {
  const t = String(v ?? "").trim();
  const n = Number(t);
  return t !== "" && Number.isFinite(n) ? String(n) : t;
}
