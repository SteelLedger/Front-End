// The backend stores all raw-material / production quantities in GRAMS.
// The UI works in KILOGRAMS. These helpers convert between the two.

export function kgToGm(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000);
}

export function gmToKg(gm) {
  const n = Number(gm);
  if (!Number.isFinite(n)) return 0;
  return n / 1000;
}

// Grams -> kg as a display string (e.g. 350 -> "0.35", trims trailing zeros).
export function gmToKgDisplay(gm) {
  const kg = gmToKg(gm);
  return Number(kg.toFixed(3)).toLocaleString("en-IN");
}
