// Dashboard helpers, matching the /dashboard/* API contract.
//
// Four endpoints feed the page: summary, material-flow, top-products and
// out-of-stock. All quantities come over the wire in GRAMS and all dates in
// DD/MM/YYYY, same as the rest of the API. These normalizers flatten the
// response envelope (`res.data.data`) into the shapes the page renders, and
// default every number to 0 so a missing field can't render "NaN kg".

const num = (v) => Number(v) || 0;

/** The `data` block out of the standard `{ success, message, data }` envelope. */
const body = (res) => res?.data?.data ?? {};

/* --------------------------------- summary -------------------------------- */

/**
 * GET /dashboard/summary -> the five KPI cards and the yield donut.
 *
 * Note on `byProductQty`: the API documents it as *current* by-product
 * inventory, not the amount produced in the selected period — unlike
 * `producedQty` and `wasteQty`, which are period-scoped. It's the only
 * by-product figure the endpoint returns, so it's what the donut shows.
 */
export function normalizeSummary(res) {
  const d = body(res);
  return {
    soldQty: num(d.soldQtyThisMonth),
    invoiceCount: num(d.invoiceCountThisMonth),
    purchaseQty: num(d.purchaseQtyThisMonth),
    purchaseBillCount: num(d.purchaseBillCountThisMonth),
    producedQty: num(d.producedQtyThisMonth),
    productionRunCount: num(d.productionRunCountThisMonth),
    wasteQty: num(d.wasteThisMonth),
    wastePercentage: num(d.wastePercentageThisMonth),
    rawMaterialQty: num(d.rawMaterialInStock),
    rawMaterialTypes: num(d.rawMaterialSheetTypes),
    byProductQty: num(d.byProductQty),
    byProductTypes: num(d.byProductTypes),
    period: d.period ?? null,
  };
}

/** Donut slices — the produced/byproduct/waste quantities, straight off summary. */
export function yieldBreakdown(summary) {
  return [
    { name: "Products", value: summary.producedQty, color: "#1E4D96" },
    { name: "Byproducts", value: summary.byProductQty, color: "#4A80D8" },
    { name: "Waste", value: summary.wasteQty, color: "#F0B429" },
  ];
}

/* ------------------------------ material flow ------------------------------ */

/**
 * GET /dashboard/material-flow -> recharts rows. Buckets arrive oldest-first
 * with a "Mar 2026" label; the year is dropped from the axis when every bucket
 * shares one, which is the common case (the default range is 6 months).
 */
export function normalizeMaterialFlow(res) {
  const months = body(res).months;
  if (!Array.isArray(months)) return [];

  const oneYear = new Set(months.map((m) => m.year)).size <= 1;

  return months.map((m) => ({
    key: m.key ?? `${m.year}-${m.month}`,
    month: oneYear ? (m.label ?? "").split(" ")[0] || m.key : m.label,
    purchased: num(m.purchasedQty),
    produced: num(m.producedQty),
    sold: num(m.soldQty),
  }));
}

/**
 * The material-flow chart follows the page filter, but a trend line needs more
 * than one point: on a range shorter than `minMonths` it keeps the selected end
 * date and walks the start back, so "This Month" still draws six bars instead
 * of one. Wider ranges are passed through untouched. ISO dates in and out.
 */
export function trendRange(fromISO, toISO, minMonths = 6) {
  if (!fromISO || !toISO) return { from: fromISO, to: toISO };

  const [fy, fm] = fromISO.split("-").map(Number);
  const [ty, tm] = toISO.split("-").map(Number);
  const span = (ty - fy) * 12 + (tm - fm) + 1;
  if (span >= minMonths) return { from: fromISO, to: toISO };

  const start = new Date(ty, tm - minMonths, 1);
  const month = String(start.getMonth() + 1).padStart(2, "0");
  return { from: `${start.getFullYear()}-${month}-01`, to: toISO };
}

/* ------------------------------- top products ------------------------------ */

/** GET /dashboard/top-products -> bar rows, highest first (the API sorts). */
export function normalizeTopProducts(res) {
  const products = body(res).products;
  if (!Array.isArray(products)) return [];
  return products.map((p, i) => ({
    id: p.productId ?? `top-${i}`,
    name: p.productName || p.productSize || "—",
    quantity: num(p.quantity),
  }));
}

/* ------------------------------- out of stock ------------------------------ */

// Where each kind of empty row sends you when clicked.
const OUT_OF_STOCK_GROUPS = [
  { field: "products", kind: "Product", href: "/product-inventory" },
  { field: "rawMaterials", kind: "Raw material", href: "/inventory" },
  { field: "byProducts", kind: "Byproduct", href: "/product-inventory" },
];

const outOfStockName = (row) =>
  row.productName || row.rawMaterialName || row.byProductName || "—";

/**
 * GET /dashboard/out-of-stock -> one flat list. The endpoint returns three
 * arrays (up to 3 rows each, all at qty 0); the panel shows them together with
 * a kind label, so the caller doesn't have to know which array a row came from.
 */
export function normalizeOutOfStock(res) {
  const d = body(res);
  return OUT_OF_STOCK_GROUPS.flatMap(({ field, kind, href }) => {
    const rows = Array.isArray(d[field]) ? d[field] : [];
    return rows.map((row, i) => ({
      key: `${field}-${row._id ?? i}`,
      // A byproduct is only identifiable with its source material — the same
      // name comes off several sheets, same as in the sales picker.
      name:
        field === "byProducts" && row.rawMaterialName
          ? `${outOfStockName(row)} (${row.rawMaterialName})`
          : outOfStockName(row),
      kind,
      href,
    }));
  });
}
