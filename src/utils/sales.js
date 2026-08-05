// Sales helpers, matching the /sales API contract.
//
// A sale is: partyId, invoiceNumber, date (DD/MM/YYYY), paymentType (enum),
// productId, quantity (GRAMS on the wire, kg in the UI). The API carries no
// prices or byproducts, so neither does this module.

import { todayISO, isoToDMY, dmyToISO } from "./party";
import { kgToGm, gmToKg } from "./units";

// The API's PaymentType enum. `value` goes on the wire, `label` on screen.
export const PAYMENT_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "credit", label: "Credit" },
  { value: "cheque", label: "Cheque" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

export function paymentTypeLabel(value) {
  return PAYMENT_TYPES.find((p) => p.value === value)?.label || value || "—";
}

/**
 * How a byproduct reads everywhere it's picked or listed: "Khuniya (10X120P M5)".
 * The same byproduct name can come off different raw materials, so the source
 * is what tells two otherwise identical entries apart.
 */
export function byProductLabel(name, rawMaterialName) {
  const base = (name || "").trim();
  const from = (rawMaterialName || "").trim();
  if (!base) return from ? `(${from})` : "";
  return from ? `${base} (${from})` : base;
}

// Fields GET /sales will sort on — anything else has to stay unsorted.
// `quantity` dropped out when sales went multi-item: a sale no longer has one.
export const SORTABLE_FIELDS = [
  "date",
  "invoiceNumber",
  "paymentType",
  "createdAt",
];

export const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

function iso(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** From/to ISO dates for a period preset. `custom` keeps the user's own range. */
export function rangeForPeriod(period) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = now.getDate();

  switch (period) {
    case "today":
      return { from: iso(now), to: iso(now) };
    case "yesterday": {
      const d = new Date(y, m, day - 1);
      return { from: iso(d), to: iso(d) };
    }
    case "this_week": {
      // Week starts Monday.
      const start = new Date(y, m, day - ((now.getDay() + 6) % 7));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: iso(start), to: iso(end) };
    }
    case "this_month":
      return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "last_month":
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case "this_quarter": {
      const q = Math.floor(m / 3) * 3;
      return { from: iso(new Date(y, q, 1)), to: iso(new Date(y, q + 3, 0)) };
    }
    case "this_year":
      return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) };
    default:
      return null;
  }
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-08-01" -> "01 Aug 2026" */
export function formatISODate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d} ${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

/** A range as one readable label for the filter chip. */
export function formatDateRange(fromISO, toISO) {
  if (!fromISO && !toISO) return "All dates";
  if (!fromISO) return `Until ${formatISODate(toISO)}`;
  if (!toISO) return `From ${formatISODate(fromISO)}`;
  if (fromISO === toISO) return formatISODate(fromISO);

  const [fy, fm, fd] = fromISO.split("-");
  const [ty, tm, td] = toISO.split("-");
  // Same year reads fine without repeating it on both sides.
  if (fy === ty) {
    return `${fd} ${MONTHS[Number(fm) - 1]} – ${td} ${MONTHS[Number(tm) - 1]} ${ty}`;
  }
  return `${formatISODate(fromISO)} – ${formatISODate(toISO)}`;
}

/** One item line on a sale. `id` is a productId or a byproduct slug. */
export function emptyLine() {
  return { id: "", name: "", qty: "" }; // qty in kg
}

/** Lines the user actually filled in — blank rows are ignored on save. */
export const filledLines = (lines) =>
  (lines || []).filter((l) => l.id && Number(l.qty) > 0);

/** A draft line is ready to add once it has both an item and a quantity. */
export const isCompleteLine = (l) => !!l?.id && Number(l?.qty) > 0;

/** Something was typed but the line isn't addable yet. */
export const isPartialLine = (l) =>
  !isCompleteLine(l) && (!!l?.id || String(l?.qty ?? "").trim() !== "");

export const linesTotalGm = (lines) =>
  filledLines(lines).reduce((sum, l) => sum + kgToGm(l.qty), 0);

/** Blank drafts for the two "add an item" composers. */
export const emptyDraft = () => ({
  products: emptyLine(),
  byProducts: emptyLine(),
});

export function emptySaleForm() {
  return {
    date: todayISO(),
    invoiceNumber: "",
    partyId: "",
    partyName: "",
    paymentType: "",
    // Committed lines only — the in-progress row lives in `draft`.
    products: [],
    byProducts: [],
    draft: emptyDraft(),
    error: "",
    errorFields: [],
  };
}

/**
 * Drawer form -> POST/PUT body. Quantities go over the wire in grams.
 * Product lines carry the product-inventory ObjectId; byproduct lines carry
 * `byProductInventoryId`. At least one line of either kind is required.
 */
export function buildSalePayload(f) {
  return {
    partyId: f.partyId,
    invoiceNumber: f.invoiceNumber.trim(),
    date: isoToDMY(f.date),
    paymentType: f.paymentType,
    products: filledLines(f.products).map((l) => ({
      productId: l.id,
      quantity: kgToGm(l.qty),
    })),
    byProducts: filledLines(f.byProducts).map((l) => ({
      byProductInventoryId: l.id,
      quantity: kgToGm(l.qty),
    })),
  };
}

const idOf = (v) => (typeof v === "object" && v !== null ? v._id : v) ?? "";
const sumQty = (lines) =>
  lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);

/** A sale from the API -> the shape the list renders. Quantities in grams. */
export function normalizeSale(raw) {
  const products = (raw.products ?? []).map((p) => ({
    id: idOf(p.productId),
    name: p.productName ?? "",
    size: p.productSize ?? "",
    quantity: p.quantity ?? 0,
  }));
  const byProducts = (raw.byProducts ?? []).map((b) => ({
    id: idOf(b.byProductInventoryId),
    name: b.byProductName ?? "",
    slug: b.slug ?? "",
    rawMaterialName: b.rawMaterialName ?? "",
    quantity: b.quantity ?? 0,
  }));

  const totalProductQty = raw.totalProductQty ?? sumQty(products);
  const totalByProductQty = raw.totalByProductQty ?? sumQty(byProducts);

  return {
    id: raw._id ?? raw.id,
    invoiceNumber: raw.invoiceNumber ?? "",
    date: raw.date ?? "", // DD/MM/YYYY
    partyId: idOf(raw.partyId),
    partyName: raw.partyName ?? "",
    paymentType: raw.paymentType ?? "",
    products,
    byProducts,
    totalProductQty,
    totalByProductQty,
    totalQuantity: totalProductQty + totalByProductQty,
  };
}

/** A normalized sale -> the drawer form (grams back to kg). */
export function saleToForm(s) {
  const toLine = (l) => ({
    id: l.id ?? "",
    name: l.name ?? "",
    qty: l.quantity != null ? gmToKg(l.quantity) : "",
  });

  // Byproduct lines carry their source material, same as the picker does.
  const toByProductLine = (l) => ({
    ...toLine(l),
    name: byProductLabel(l.name, l.rawMaterialName),
  });

  return {
    date: s.date ? dmyToISO(s.date) : todayISO(),
    invoiceNumber: s.invoiceNumber || "",
    partyId: s.partyId || "",
    partyName: s.partyName || "",
    paymentType: s.paymentType || "",
    products: filledLines((s.products ?? []).map(toLine)),
    byProducts: filledLines((s.byProducts ?? []).map(toByProductLine)),
    draft: emptyDraft(),
    error: "",
    errorFields: [],
  };
}

/** Dig the list, summary and total out of the response envelope. */
export function extractSales(res) {
  const body = res?.data ?? {};
  const d = body.data ?? {};
  const list = Array.isArray(d) ? d : (d.sales ?? []);
  const summary = (Array.isArray(d) ? {} : d.summary) ?? {};
  const total =
    body.meta?.pagination?.total ?? (Array.isArray(list) ? list.length : 0);
  return {
    list: Array.isArray(list) ? list : [],
    summary,
    total: Number(total) || 0,
  };
}
