// Purchase helpers, matching the /purchases API contract.
//
// A purchase is one BILL: a supplier, an invoice number and a date, with one
// or more line items under it. Each line is size + point + grade + quantity +
// bundles, and the backend derives `rawMaterialName` ("10X120P M5") from the
// first three. Quantities are GRAMS on the wire and kg in the UI; bundles are
// a plain integer count.

import { todayISO, isoToDMY, dmyToISO } from "./party";
import { kgToGm, gmToKg } from "./units";

// Fields GET /purchases will sort on. The per-line fields (size/point/grade)
// aren't among them any more — a bill with three lines has no single size.
export const SORTABLE_FIELDS = [
  "date",
  "invoiceNumber",
  "totalQuantity",
  "totalBundles",
  "createdAt",
];

/** One blank row in the items editor. `quantity` is kg here, grams on save. */
export function emptyLineItem() {
  return { size: "", point: "", grade: "", quantity: "", bundles: "" };
}

export function emptyPurchaseForm() {
  return {
    partyId: "",
    supplier: "", // supplier display name
    invoiceNumber: "",
    date: todayISO(),
    lineItems: [emptyLineItem()],
    error: "",
    errorFields: [],
    errorLines: [],
    errorCells: [],
  };
}

const text = (v) => String(v ?? "").trim();

/** Filled in AND a number above zero — how every amount on a line must read. */
const positive = (v) => text(v) !== "" && Number(v) > 0;

/** Nothing typed in any of the five fields — a leftover blank row. */
export const isBlankLine = (l) =>
  !text(l.size) &&
  !text(l.point) &&
  !text(l.grade) &&
  !text(l.quantity) &&
  !text(l.bundles);

/** The five fields of a line, in the order the items editor shows them. */
export const LINE_FIELDS = ["size", "point", "grade", "quantity", "bundles"];

/**
 * Size, quantity and bundles are amounts: a 0, a negative or a stray letter is
 * not a line the backend can store. Point and grade are labels ("120p", "M5"),
 * so they only have to be present.
 */
export const AMOUNT_FIELDS = ["size", "quantity", "bundles"];

/** How each field is named inside a validation message. */
const FIELD_LABELS = {
  size: "size",
  point: "point",
  grade: "grade",
  quantity: "quantity",
  bundles: "bundles",
};

export const fieldLabels = (fields = []) =>
  fields.map((f) => FIELD_LABELS[f] ?? f);

/** Which of the five fields this line has left empty, in editor order. */
export const missingFields = (l) => LINE_FIELDS.filter((f) => !text(l[f]));

/** Which amounts read as zero, negative or non-numeric, in editor order. */
export const notPositiveFields = (l) =>
  AMOUNT_FIELDS.filter((f) => !positive(l[f]));

/** Something typed in all five fields, whatever those values say. */
export const isFilledLine = (l) => !missingFields(l).length;

export const hasPositiveAmounts = (l) => !notPositiveFields(l).length;

/** Every field the API requires on a line is present and positive. */
export const isCompleteLine = (l) => isFilledLine(l) && hasPositiveAmounts(l);

/** Rows the user actually touched; trailing blanks are ignored on save. */
export const filledLines = (lines = []) => lines.filter((l) => !isBlankLine(l));

/** Running totals for the drawer footer. Quantity comes back in grams. */
export function lineTotals(lines = []) {
  return filledLines(lines).reduce(
    (acc, l) => ({
      quantityGm: acc.quantityGm + kgToGm(l.quantity || 0),
      bundles: acc.bundles + (Number(l.bundles) || 0),
    }),
    { quantityGm: 0, bundles: 0 },
  );
}

/**
 * "10X120P M5" — the same name the backend builds from size/point/grade.
 * A row that already carries `rawMaterialName` (anything read back from the
 * API) uses that as-is rather than guessing at the format.
 */
export function lineLabel(l = {}) {
  if (l.rawMaterialName) return l.rawMaterialName;
  const size = text(l.size);
  const point = text(l.point);
  const grade = text(l.grade);
  if (!size && !point && !grade) return "";
  return `${size}X${point}${grade ? ` ${grade}` : ""}`.toUpperCase();
}

/** Drawer form -> POST/PUT body. Quantities go over the wire in grams. */
export function buildPurchasePayload(f) {
  return {
    partyId: f.partyId,
    invoiceNumber: f.invoiceNumber.trim(),
    date: isoToDMY(f.date),
    lineItems: filledLines(f.lineItems).map((l) => ({
      size: text(l.size),
      point: text(l.point),
      grade: text(l.grade),
      quantity: kgToGm(l.quantity),
      bundles: Number(l.bundles),
    })),
  };
}

/** A bill from the API -> the shape the list renders. Quantities in grams. */
export function normalizePurchase(raw) {
  const lineItems = (raw.lineItems ?? []).map((l) => ({
    size: l.size ?? "",
    point: l.point ?? "",
    grade: l.grade ?? "",
    quantity: Number(l.quantity) || 0,
    bundles: Number(l.bundles) || 0,
    rawMaterialName: l.rawMaterialName ?? "",
  }));
  const sum = (key) =>
    lineItems.reduce((total, l) => total + (Number(l[key]) || 0), 0);

  return {
    id: raw._id ?? raw.id,
    partyId:
      (typeof raw.partyId === "object" ? raw.partyId?._id : raw.partyId) ?? "",
    supplier: raw.supplierName ?? raw.supplier ?? "",
    invoiceNumber: raw.invoiceNumber ?? "",
    date: raw.date ?? "", // DD/MM/YYYY
    lineItems,
    totalQuantity: raw.totalQuantity ?? sum("quantity"),
    totalBundles: raw.totalBundles ?? sum("bundles"),
    totalSheetTypes:
      raw.totalSheetTypes ??
      new Set(lineItems.map(lineLabel).filter(Boolean)).size,
  };
}

/** A normalized bill -> the drawer form (grams back to kg). */
export function purchaseToForm(p) {
  return {
    partyId: p.partyId || "",
    supplier: p.supplier || "",
    invoiceNumber: p.invoiceNumber || "",
    date: p.date ? dmyToISO(p.date) : todayISO(),
    lineItems: p.lineItems?.length
      ? p.lineItems.map((l) => ({
          size: l.size ?? "",
          point: l.point ?? "",
          grade: l.grade ?? "",
          quantity: l.quantity != null ? gmToKg(l.quantity) : "",
          bundles: l.bundles != null ? String(l.bundles) : "",
        }))
      : [emptyLineItem()],
    error: "",
    errorFields: [],
    errorLines: [],
    errorCells: [],
  };
}

/** Dig the list, summary and total out of the response envelope. */
export function extractPurchases(res) {
  const body = res?.data ?? {};
  const d = body.data ?? {};
  const list = Array.isArray(d) ? d : (d.purchases ?? d.results ?? []);
  const summary = (Array.isArray(d) ? {} : d.summary) ?? {};
  const total =
    body.meta?.pagination?.total ?? (Array.isArray(list) ? list.length : 0);
  return {
    list: Array.isArray(list) ? list : [],
    summary,
    total: Number(total) || 0,
  };
}
