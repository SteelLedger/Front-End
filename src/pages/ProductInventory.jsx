import { useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Package, PackageCheck, PackageX, Upload } from "lucide-react";
import InventoryTab from "../components/InventoryTab";
import StockAdjustmentModal from "../components/StockAdjustmentModal";
import BulkImportModal from "../components/BulkImportModal";
import { gmToKgDisplay } from "../utils/units";
import {
  GetProducts,
  GetByProducts,
  adjustProductStock,
  importProductInventory,
} from "../services/apiServices";

// What's specific to THIS import; the modal adds the header + row-cap rules.
const IMPORT_RULES = [
  "Columns: productName, productSize, rawMaterialName, totalQty (kg).",
  "Duplicate productName rows are skipped.",
  "totalQty is in KILOGRAMS here, not grams.",
  "Leave rawMaterialName empty for a product with no source sheet.",
  "Any row with a quantity also lands in that product's inbound history as a stock adjustment.",
];

function statusBadge(status) {
  return (
    <span
      className={`inline-block whitespace-nowrap text-xs font-medium px-2 py-0.5 rounded-full ${
        status === "in_stock"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700"
      }`}
    >
      {status === "in_stock" ? "In stock" : "Out of stock"}
    </span>
  );
}

function extractInv(key) {
  return (res) => {
    const body = res?.data ?? {};
    const d = body.data ?? {};
    const list = Array.isArray(d) ? d : (d[key] ?? []);
    const summary = (Array.isArray(d) ? {} : d.summary) ?? {};
    const total =
      body.meta?.pagination?.total ?? (Array.isArray(list) ? list.length : 0);
    return {
      list: Array.isArray(list) ? list : [],
      summary,
      total: Number(total) || 0,
    };
  };
}
const extractProducts = extractInv("products");
const extractByProducts = extractInv("byProducts");

const normalizeProduct = (raw) => ({
  // The real inventory id — the history page passes it as `productId`.
  id: raw._id ?? raw.id ?? raw.productName,
  productName: raw.productName || "—",
  productSize: raw.productSize || "—",
  rawMaterialName: raw.rawMaterialName || "—",
  totalQtyGm: raw.totalQty ?? 0,
  status:
    raw.status || (Number(raw.totalQty) > 0 ? "in_stock" : "out_of_stock"),
});
const normalizeByProduct = (raw) => ({
  id: raw.slug,
  byProductName: raw.byProductName || "—",
  rawMaterialName: raw.rawMaterialName || "",
  totalQtyGm: raw.totalQty ?? 0,
  status:
    raw.status || (Number(raw.totalQty) > 0 ? "in_stock" : "out_of_stock"),
});

const qtyCell = (r) => (
  <span className="font-semibold text-slate-900">
    {gmToKgDisplay(r.totalQtyGm)} kg
  </span>
);

const PRODUCT_COLUMNS = [
  {
    label: "Product",
    sortField: "productName",
    render: (r) => (
      <Link
        to={`/product-inventory/${r.id}`}
        className="-my-1.5 rounded-md py-1.5 font-medium text-[#1E4D96] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40"
        title={`View production history for ${r.productName}`}
      >
        {r.productName}
      </Link>
    ),
  },
  {
    label: "Product Size",
    sortField: "productSize",
    render: (r) => r.productSize,
  },
  {
    label: "Raw Material Sheet",
    sortField: "rawMaterialName",
    render: (r) => r.rawMaterialName,
  },
  { label: "Total Qty", sortField: "totalQty", render: qtyCell },
  { label: "Status", sortField: null, render: (r) => statusBadge(r.status) },
];

const BYPRODUCT_COLUMNS = [
  {
    label: "Byproduct",
    sortField: "byProductName",
    width: "w-1/2",
    render: (r) => (
      <span
        className="block truncate"
        title={
          r.rawMaterialName
            ? `${r.byProductName} (from ${r.rawMaterialName})`
            : r.byProductName
        }
      >
        <span className="font-medium text-slate-800">{r.byProductName}</span>
        {r.rawMaterialName && (
          <span className="ml-1.5 text-slate-400">({r.rawMaterialName})</span>
        )}
      </span>
    ),
  },
  {
    label: "Total Qty",
    sortField: "totalQty",
    width: "w-1/4",
    render: qtyCell,
  },
  {
    label: "Status",
    sortField: null,
    width: "w-1/4",
    render: (r) => statusBadge(r.status),
  },
];

// Phone/tablet cards — the same layout as the Raw Material page's. Module-level
// so InventoryTab gets a stable object. `rawMaterialName` is "—" (product) or
// "" (byproduct) when there's no source sheet, and the line drops it then.
const hasSheet = (name) => name && name !== "—";

const PRODUCT_CARD = {
  title: (r) => r.productName,
  to: (r) => `/product-inventory/${r.id}`,
  subtitle: (r) =>
    `Size ${r.productSize}` +
    (hasSheet(r.rawMaterialName) ? ` · Cut from ${r.rawMaterialName}` : ""),
};

const BYPRODUCT_CARD = {
  title: (r) => r.byProductName,
  subtitle: (r) =>
    hasSheet(r.rawMaterialName) ? `From ${r.rawMaterialName}` : null,
};

const productStats = (s) => [
  {
    icon: Boxes,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    label: "Total Qty (kg)",
    value: gmToKgDisplay(s.totalQuantity || 0),
  },
  {
    icon: Package,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    label: "Product Types",
    value: String(s.totalProductTypes ?? 0),
  },
  {
    icon: PackageCheck,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    label: "In Stock",
    value: String(s.inStockCount ?? 0),
  },
  {
    icon: PackageX,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    label: "Out of Stock",
    value: String(s.outOfStockCount ?? 0),
  },
];

const byproductStats = (s) => [
  {
    icon: Boxes,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    label: "Total Qty (kg)",
    value: gmToKgDisplay(s.totalQuantity || 0),
  },
  {
    icon: Package,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    label: "Byproduct Types",
    value: String(s.totalByProductTypes ?? 0),
  },
  {
    icon: PackageCheck,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    label: "In Stock",
    value: String(s.inStockCount ?? 0),
  },
  {
    icon: PackageX,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    label: "Out of Stock",
    value: String(s.outOfStockCount ?? 0),
  },
];

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
        active
          ? "bg-[#1E4D96] text-white"
          : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function ProductInventory() {
  const [tab, setTab] = useState("items");

  // The product row being corrected by hand, or null.
  const [adjustRow, setAdjustRow] = useState(null);
  // Bumped after a save or a queued import so InventoryTab reloads.
  const [reloadKey, setReloadKey] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const refresh = () => setReloadKey((k) => k + 1);

  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5 space-y-4 lg:space-y-5">
      <div className="max-w-[1400px] mx-auto">
        {/* Inner tabs + the Items-only import action */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TabBtn active={tab === "items"} onClick={() => setTab("items")}>
              Items
            </TabBtn>
            <TabBtn
              active={tab === "byproducts"}
              onClick={() => setTab("byproducts")}
            >
              Byproducts
            </TabBtn>
          </div>
          {/* There is no by-product import endpoint, so this follows the tab. */}
          {tab === "items" && (
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E4D96] bg-white px-4 py-2 text-sm font-semibold text-[#1E4D96] transition-colors hover:bg-[#EEF3FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40"
            >
              <Upload size={15} />
              Bulk Import
            </button>
          )}
        </div>

        {tab === "items" ? (
          <InventoryTab
            fetchFn={GetProducts}
            extract={extractProducts}
            normalize={normalizeProduct}
            columns={PRODUCT_COLUMNS}
            card={PRODUCT_CARD}
            statCards={productStats}
            searchPlaceholder="Search product, size, raw material"
            reloadKey={reloadKey}
            onAdjust={setAdjustRow}
          />
        ) : (
          <InventoryTab
            fetchFn={GetByProducts}
            extract={extractByProducts}
            normalize={normalizeByProduct}
            columns={BYPRODUCT_COLUMNS}
            card={BYPRODUCT_CARD}
            statCards={byproductStats}
            searchPlaceholder="Search byproduct or raw material"
          />
        )}
      </div>

      {/*
        Items only. There is no POST /by-products/{id}/stock-adjustments, so
        the Byproducts tab has no adjust action to open this.
      */}
      <StockAdjustmentModal
        open={!!adjustRow}
        itemName={adjustRow?.productName}
        currentQtyGm={adjustRow?.totalQtyGm ?? 0}
        onSave={(payload) => adjustProductStock(adjustRow.id, payload)}
        onSaved={refresh}
        onClose={() => setAdjustRow(null)}
      />

      {importOpen && (
        <BulkImportModal
          title="Bulk Import Product Inventory"
          subtitle="Upload a CSV to add many products at once"
          noun="product inventory"
          importFn={importProductInventory}
          sampleUrl="/product-inventory-import-example.csv"
          rules={IMPORT_RULES}
          onClose={() => {
            setImportOpen(false);
            // The job runs off a queue, so rows rarely land before this — but
            // a small file can finish quickly, and refetching costs one call.
            refresh();
          }}
          onQueued={refresh}
        />
      )}
    </div>
  );
}
