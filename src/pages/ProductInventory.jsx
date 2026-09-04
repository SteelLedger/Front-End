import { useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Package, PackageCheck, PackageX } from "lucide-react";
import InventoryTab from "../components/InventoryTab";
import ByproductsModal from "../components/ByproductsModal";
import { gmToKgDisplay } from "../utils/units";
import {
  GetProducts,
  GetByProducts,
  GetProductions,
} from "../services/apiServices";

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
  // Byproducts viewer: { loading, productName, byProducts } | null
  const [viewState, setViewState] = useState(null);

  // A product-inventory row is aggregated by product name, so its byproducts
  // come from that product's productions: fetch them and sum by byproduct name.
  async function openView(row) {
    setViewState({
      loading: true,
      productName: row.productName,
      byProducts: [],
    });
    try {
      // `productId` matches the inventory row exactly, and the list already
      // carries each run's byProducts — this used to search by name and then
      // fetch every production by id, one request apiece.
      const listRes = await GetProductions({ productId: row.id, limit: 100 });
      const d = listRes?.data?.data ?? {};
      const runs = Array.isArray(d) ? d : (d.productions ?? []);

      const totals = new Map();
      runs.forEach((run) => {
        (run.byProducts || []).forEach((bp) => {
          const name = bp.byProductName || "—";
          totals.set(name, (totals.get(name) || 0) + (Number(bp.qty) || 0));
        });
      });

      setViewState({
        loading: false,
        productName: row.productName,
        byProducts: [...totals.entries()].map(([byProductName, qty]) => ({
          byProductName,
          qty,
        })),
      });
    } catch {
      setViewState({
        loading: false,
        productName: row.productName,
        byProducts: [],
      });
    }
  }

  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5 space-y-4 lg:space-y-5">
      <div className="max-w-[1400px] mx-auto">
        {/* Inner tabs */}
        <div className="flex items-center gap-2 mb-4">
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

        {tab === "items" ? (
          <InventoryTab
            fetchFn={GetProducts}
            extract={extractProducts}
            normalize={normalizeProduct}
            columns={PRODUCT_COLUMNS}
            statCards={productStats}
            searchPlaceholder="Search product, size, raw material"
            onView={openView}
          />
        ) : (
          <InventoryTab
            fetchFn={GetByProducts}
            extract={extractByProducts}
            normalize={normalizeByProduct}
            columns={BYPRODUCT_COLUMNS}
            statCards={byproductStats}
            searchPlaceholder="Search byproduct or raw material"
          />
        )}
      </div>

      <ByproductsModal state={viewState} onClose={() => setViewState(null)} />
    </div>
  );
}
