// Report catalogue and date rules for POST /reports/request.
//
// Two shapes of report, and the difference drives the whole UI:
//   * history    — needs `fromDate`/`toDate` (DD/MM/YYYY), a window over past
//                  records. The API rejects dates outside the last 2 years.
//   * inventory  — a snapshot of stock right now, and must NOT carry dates.
//
// Every report is generated asynchronously and emailed to the requesting
// admin, so nothing here downloads a file.

/** Reports the API accepts, in the order the page lists them. */
export const REPORTS = [
  {
    type: "purchase_history",
    kind: "history",
    label: "Purchase History",
    description:
      "Every purchase bill in the period with its line items, supplier, quantities and bundle counts.",
    icon: "ShoppingCart",
    tone: "blue",
  },
  {
    type: "production_history",
    kind: "history",
    label: "Production History",
    description:
      "Every cutting run in the period — the sheet used, what it produced, plus waste, balance patta and byproducts.",
    icon: "Factory",
    tone: "violet",
  },
  {
    type: "sales_history",
    kind: "history",
    label: "Sales History",
    description:
      "Every invoice in the period with its party, products and byproducts sold, quantities and payment type.",
    icon: "Receipt",
    tone: "emerald",
  },
  {
    type: "raw_material_inventory",
    kind: "inventory",
    label: "Raw Material Stock",
    description:
      "Raw material on hand right now, by size, point and grade, with quantities and stock status.",
    icon: "Layers",
    tone: "amber",
  },
  {
    type: "product_inventory",
    kind: "inventory",
    label: "Product Stock",
    description:
      "Finished product on hand right now, by product name and size, with quantities and stock status.",
    icon: "Package",
    tone: "sky",
  },
];

/** Icon tile colours, kept out of the components so a card stays declarative. */
export const TONES = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
};

/** The API's window: nothing older than 2 years, nothing in the future. */
export const MAX_RANGE_YEARS = 2;

/** ISO date exactly `years` before today — the earliest date a report accepts. */
export function earliestISO(years = MAX_RANGE_YEARS) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Why this range can't be submitted, or "" when it can. Mirrors the API's own
 * rules so a bad range is caught before the request rather than as a 400 —
 * ISO in, because that is what the date inputs speak.
 */
export function rangeProblem(fromISO, toISO) {
  if (!fromISO || !toISO) return "Pick a start and end date.";
  if (fromISO > toISO) return "The start date is after the end date.";

  const pad = (n) => String(n).padStart(2, "0");
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (toISO > today) return "The end date can't be in the future.";
  if (fromISO < earliestISO()) {
    return `Reports only reach back ${MAX_RANGE_YEARS} years.`;
  }

  // Span: at most 2 years from the start date.
  const spanEnd = new Date(`${fromISO}T00:00:00`);
  spanEnd.setFullYear(spanEnd.getFullYear() + MAX_RANGE_YEARS);
  const limit = `${spanEnd.getFullYear()}-${pad(spanEnd.getMonth() + 1)}-${pad(spanEnd.getDate())}`;
  if (toISO > limit) {
    return `A report can cover at most ${MAX_RANGE_YEARS} years at a time.`;
  }
  return "";
}
