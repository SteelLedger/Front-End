// Sales helpers. The sales APIs aren't built yet, so the page runs off the
// seed rows below and keeps everything in local state. When the endpoints land,
// replace `seedSales()` with the list call and post `buildSalePayload()`.

import { todayISO, isoToDMY } from "./party";

export const TRANSACTION_TYPES = ["Sale", "Sale Return", "Sale Order"];

// Payment type is a free-text field (per spec) — these only feed the input's
// datalist so the common ones are one click away.
export const PAYMENT_TYPE_SUGGESTIONS = [
  "Cash",
  "Cheque",
  "UPI",
  "Bank Transfer",
  "Credit",
];

export const FIRM_OPTIONS = ["All Firms", "Main Firm", "Branch Firm"];
export const USER_OPTIONS = ["All Users", "Admin", "Operator"];

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

export function formatINR(value) {
  const n = Number(value) || 0;
  return `₹ ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function saleBalance(sale) {
  return (Number(sale.amount) || 0) - (Number(sale.received) || 0);
}

export function emptySaleForm() {
  return {
    date: todayISO(),
    invoiceNumber: "",
    partyId: "",
    partyName: "",
    productName: "",
    byProductName: "",
    paymentType: "",
    amount: "",
    received: "",
    error: "",
    errorFields: [],
  };
}

/** Drawer form -> the shape the create/update endpoint is expected to take. */
export function buildSalePayload(f) {
  return {
    date: isoToDMY(f.date),
    invoiceNumber: f.invoiceNumber.trim(),
    partyId: f.partyId || undefined,
    partyName: f.partyName.trim(),
    productName: f.productName.trim(),
    byProductName: f.byProductName.trim(),
    paymentType: f.paymentType.trim(),
    amount: Number(f.amount) || 0,
    received: Number(f.received) || 0,
  };
}

/** A sale row (list shape) built from the drawer form. */
export function saleFromForm(f, id) {
  return {
    id,
    date: f.date,
    invoiceNumber: f.invoiceNumber.trim(),
    partyId: f.partyId || "",
    partyName: f.partyName.trim(),
    productName: f.productName.trim(),
    byProductName: f.byProductName.trim(),
    transaction: "Sale",
    paymentType: f.paymentType.trim(),
    amount: Number(f.amount) || 0,
    received: Number(f.received) || 0,
  };
}

export function saleToForm(s) {
  return {
    date: s.date,
    invoiceNumber: s.invoiceNumber || "",
    partyId: s.partyId || "",
    partyName: s.partyName || "",
    productName: s.productName || "",
    byProductName: s.byProductName || "",
    paymentType: s.paymentType || "",
    amount: s.amount ?? "",
    received: s.received ?? "",
    error: "",
    errorFields: [],
  };
}

// Placeholder rows so the list, filters and totals have something to show
// before the API exists. Dates are relative to today so they never go stale.
const SEED = [
  ["1807", "HARIHAR", "Patta 101", "", "Cash", 802, 0, 0],
  ["1806", "HARIHAR", "Patta 102", "Khuniya", "Cash", 860, 860, 0],
  ["1805", "MEWAD TRADER", "Patta 95", "", "UPI", 199, 199, -1],
  ["1804", "LK INDUSTRIES", "Patta 101", "Lafa", "Cash", 902, 0, -1],
  ["1803", "MALVI ENGINEERS", "Patta 110", "", "Cheque", 978, 500, -2],
  ["1802", "MALVI ENGINEERS", "Patta 102", "Scrap", "Cash", 999, 0, -2],
  ["1801", "SHREE METALS", "Patta 95", "", "Credit", 1450, 0, -3],
  ["1800", "HARIHAR", "Patta 110", "Tukda", "Cash", 620, 620, -4],
  ["1799", "MEWAD TRADER", "Patta 101", "", "Bank Transfer", 2380, 1000, -5],
  ["1798", "LK INDUSTRIES", "Patta 102", "Khuniya", "Cash", 745, 0, -6],
  ["1797", "SHREE METALS", "Patta 95", "", "UPI", 1120, 1120, -8],
  ["1796", "MALVI ENGINEERS", "Patta 110", "Lafa", "Cash", 1875, 0, -10],
];

export function seedSales() {
  return SEED.map(
    (
      [
        invoiceNumber,
        partyName,
        productName,
        byProductName,
        paymentType,
        amount,
        received,
        dayOffset,
      ],
      i,
    ) => {
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      return {
        id: `seed-${i}`,
        date: iso(d),
        invoiceNumber,
        partyId: "",
        partyName,
        productName,
        byProductName,
        transaction: "Sale",
        paymentType,
        amount,
        received,
      };
    },
  );
}

// Fallbacks for the drawer dropdowns when the (unrelated) lookup APIs are
// unreachable — keeps the form usable instead of showing three empty lists.
export const FALLBACK_PARTIES = [
  "HARIHAR",
  "MEWAD TRADER",
  "LK INDUSTRIES",
  "MALVI ENGINEERS",
  "SHREE METALS",
];
export const FALLBACK_PRODUCTS = [
  "Patta 95",
  "Patta 101",
  "Patta 102",
  "Patta 110",
];
