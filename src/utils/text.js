// Small helpers for building user-facing sentences out of a variable list of
// field names, so a validation message names what is actually wrong rather
// than reciting every field it could have complained about.

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
