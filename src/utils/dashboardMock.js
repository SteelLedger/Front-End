// Dashboard sample data.
//
// The dashboard endpoints are still being built, so every number here is MOCK.
// It's deliberately shaped like the responses the real endpoints will return —
// quantities in GRAMS, dates DD/MM/YYYY, payment types as the API enum — so
// wiring this up later means swapping the source, not reworking the page.
//
// Nothing invents a dimension the backend doesn't have: there are no prices on
// sales, purchases or stock anywhere in the API, so the only money figures are
// party balances, which do exist (openingBalance + balanceType on a party).

export const IS_MOCK = true;

const KG = 1000; // grams per kg — the wire unit is grams

function monthLabels(count) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return d.toLocaleString("en-IN", { month: "short" });
  });
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Headline figures for the current month, per module. */
export const SUMMARY = {
  sales: { totalQuantity: 8250 * KG, invoiceCount: 34, totalProductTypes: 6 },
  purchases: { totalQuantity: 11400 * KG, billCount: 18, totalSheetTypes: 5 },
  production: { productQty: 9800 * KG, wasteQty: 620 * KG, runCount: 22 },
  rawMaterial: { totalQuantity: 4150 * KG, totalTypes: 5 },
  parties: { toReceive: 486500, toPay: 192000, receivableCount: 7 },
};

/** Purchased -> produced -> sold, in grams, over the last 6 months. */
export const MATERIAL_FLOW = monthLabels(6).map((month, i) => {
  const purchased = [9200, 10400, 8800, 12100, 10900, 11400][i];
  const produced = [7900, 8800, 7600, 10300, 9400, 9800][i];
  const sold = [6800, 7900, 7100, 8900, 8100, 8250][i];
  return {
    month,
    purchased: purchased * KG,
    produced: produced * KG,
    sold: sold * KG,
  };
});

/** Where a month's raw material ended up, in grams. */
export const YIELD_BREAKDOWN = [
  { name: "Products", value: 9800 * KG, color: "#1E4D96" },
  { name: "Byproducts", value: 980 * KG, color: "#4A80D8" },
  { name: "Waste", value: 620 * KG, color: "#F0B429" },
];

/** Sale-shaped rows — same fields GET /sales returns. */
export const RECENT_SALES = [
  {
    _id: "m1",
    invoiceNumber: "SAL-2026-042",
    date: daysAgo(0),
    partyName: "HARIHAR",
    productName: "10X120P M5",
    productSize: "10",
    paymentType: "cash",
    quantity: 900 * KG,
  },
  {
    _id: "m2",
    invoiceNumber: "SAL-2026-041",
    date: daysAgo(0),
    partyName: "MEWAD TRADER",
    productName: "12X120P M5",
    productSize: "12",
    paymentType: "upi",
    quantity: 420 * KG,
  },
  {
    _id: "m3",
    invoiceNumber: "SAL-2026-040",
    date: daysAgo(1),
    partyName: "MALVI ENGINEERS",
    productName: "10X120P M5",
    productSize: "10",
    paymentType: "credit",
    quantity: 1150 * KG,
  },
  {
    _id: "m4",
    invoiceNumber: "SAL-2026-039",
    date: daysAgo(2),
    partyName: "LK INDUSTRIES",
    productName: "14X100P M4",
    productSize: "14",
    paymentType: "cheque",
    quantity: 380 * KG,
  },
  {
    _id: "m5",
    invoiceNumber: "SAL-2026-038",
    date: daysAgo(3),
    partyName: "SHREE METALS",
    productName: "12X120P M5",
    productSize: "12",
    paymentType: "bank_transfer",
    quantity: 640 * KG,
  },
];

/**
 * Stock running out. `kind` says which inventory it came from, so each row can
 * link to the right page. `status` mirrors the API's in_stock/out_of_stock.
 */
export const STOCK_ALERTS = [
  {
    name: "14X100P M4",
    kind: "Product",
    quantity: 0,
    status: "out_of_stock",
    href: "/product-inventory",
  },
  {
    name: "8X120P M5",
    kind: "Raw material",
    quantity: 45 * KG,
    status: "in_stock",
    href: "/inventory",
  },
  {
    name: "Khuniya",
    kind: "Byproduct",
    quantity: 0,
    status: "out_of_stock",
    href: "/product-inventory",
  },
  {
    name: "12X120P M5",
    kind: "Product",
    quantity: 78 * KG,
    status: "in_stock",
    href: "/product-inventory",
  },
  {
    name: "Lafa",
    kind: "Byproduct",
    quantity: 32 * KG,
    status: "in_stock",
    href: "/product-inventory",
  },
];

/** Best sellers this month, in grams. */
export const TOP_PRODUCTS = [
  { productName: "10X120P M5", quantity: 3400 * KG },
  { productName: "12X120P M5", quantity: 2450 * KG },
  { productName: "14X100P M4", quantity: 1180 * KG },
  { productName: "8X120P M5", quantity: 760 * KG },
  { productName: "16X100P M6", quantity: 460 * KG },
];
