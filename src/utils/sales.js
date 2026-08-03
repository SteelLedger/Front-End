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

// Fields GET /sales will sort on — anything else has to stay unsorted.
export const SORTABLE_FIELDS = [
  "date",
  "invoiceNumber",
  "quantity",
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

export function emptySaleForm() {
  return {
    date: todayISO(),
    invoiceNumber: "",
    partyId: "",
    partyName: "",
    productId: "",
    productName: "",
    paymentType: "",
    quantity: "", // kg in the UI
    error: "",
    errorFields: [],
  };
}

/** Drawer form -> POST/PUT body. Quantity goes over the wire in grams. */
export function buildSalePayload(f) {
  return {
    partyId: f.partyId,
    invoiceNumber: f.invoiceNumber.trim(),
    date: isoToDMY(f.date),
    paymentType: f.paymentType,
    productId: f.productId,
    quantity: kgToGm(f.quantity),
  };
}

/** A sale from the API -> the shape the list renders. */
export function normalizeSale(raw) {
  const idOf = (v) => (typeof v === "object" && v !== null ? v._id : v) ?? "";
  return {
    id: raw._id ?? raw.id,
    invoiceNumber: raw.invoiceNumber ?? "",
    date: raw.date ?? "", // DD/MM/YYYY
    partyId: idOf(raw.partyId),
    partyName: raw.partyName ?? "",
    productId: idOf(raw.productId),
    productName: raw.productName ?? "",
    productSize: raw.productSize ?? "",
    paymentType: raw.paymentType ?? "",
    quantity: raw.quantity ?? 0, // grams
  };
}

/** A normalized sale -> the drawer form (grams back to kg). */
export function saleToForm(s) {
  return {
    date: s.date ? dmyToISO(s.date) : todayISO(),
    invoiceNumber: s.invoiceNumber || "",
    partyId: s.partyId || "",
    partyName: s.partyName || "",
    productId: s.productId || "",
    productName: s.productName || "",
    paymentType: s.paymentType || "",
    quantity: s.quantity != null ? gmToKg(s.quantity) : "",
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
