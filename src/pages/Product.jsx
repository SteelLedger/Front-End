import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Plus, Boxes, Package, PackageCheck, PackageX } from "lucide-react";
import ProductionDrawer from "../components/ProductionDrawer";
import ProductionRecords from "../components/ProductionRecords";
import InventoryTab from "../components/InventoryTab";
import { todayISO } from "../utils/party";
import { kgToGm, gmToKg, gmToKgDisplay } from "../utils/units";
import { BYPRODUCT_OPTIONS } from "../utils/byproducts";
import {
  GetRawMaterials,
  GetByProducts,
  createProduction,
  updateProduction,
  getProductionById,
} from "../services/apiServices";

/* ------------------------------- form helpers ------------------------------ */

function emptyByproduct() {
  return { name: "", customName: "", qty: "" };
}
function emptyProductionForm() {
  return {
    rawMaterialId: "",
    productSize: "",
    howMany: "", // kg
    difference: "", // kg -> wasteQty
    productionDate: todayISO(),
    byproducts: [emptyByproduct()],
  };
}

function dateToISO(d) {
  const dt = new Date(`${d}T00:00:00.000Z`);
  return Number.isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
}
function isoToDateInput(iso) {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return todayISO();
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function byproductToForm(bp) {
  const known = BYPRODUCT_OPTIONS.includes(bp.byProductName);
  return {
    _id: bp._id,
    name: known ? bp.byProductName : "Other",
    customName: known ? "" : bp.byProductName || "",
    qty: bp.qty != null ? gmToKg(bp.qty) : "",
  };
}

// Map a production record (GET /productions/:id) back into the drawer form.
function productionToForm(d) {
  const rmId =
    typeof d.rawMaterialId === "object" ? d.rawMaterialId?._id : d.rawMaterialId;
  return {
    rawMaterialId: rmId ?? "",
    productSize: d.productSize ?? "",
    howMany: d.productQty != null ? gmToKg(d.productQty) : "",
    difference: d.wasteQty != null ? gmToKg(d.wasteQty) : "",
    productionDate: d.productionDate ? isoToDateInput(d.productionDate) : todayISO(),
    byproducts:
      Array.isArray(d.byProducts) && d.byProducts.length
        ? d.byProducts.map(byproductToForm)
        : [emptyByproduct()],
  };
}

function buildProductionPayload(form) {
  const byProducts = (form.byproducts || [])
    .map((b) => ({
      ...(b._id ? { _id: b._id } : {}),
      byProductName:
        b.name === "Other" ? (b.customName || "").trim() : b.name,
      qty: kgToGm(b.qty),
    }))
    .filter((b) => b.byProductName && b.qty > 0);
  return {
    rawMaterialId: form.rawMaterialId,
    productSize: String(form.productSize).trim(),
    productQty: kgToGm(form.howMany),
    wasteQty: kgToGm(form.difference),
    productionDate: dateToISO(form.productionDate),
    byProducts,
  };
}

/* ------------------------- by-product inventory config --------------------- */

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

function extractByProducts(res) {
  const body = res?.data ?? {};
  const d = body.data ?? {};
  const list = Array.isArray(d) ? d : (d.byProducts ?? []);
  const summary = (Array.isArray(d) ? {} : d.summary) ?? {};
  const total =
    body.meta?.pagination?.total ?? (Array.isArray(list) ? list.length : 0);
  return {
    list: Array.isArray(list) ? list : [],
    summary,
    total: Number(total) || 0,
  };
}

const normalizeByProduct = (raw) => ({
  id: raw.slug,
  byProductName: raw.byProductName || "—",
  slug: raw.slug || "—",
  totalQtyGm: raw.totalQty ?? 0,
  status: raw.status || (Number(raw.totalQty) > 0 ? "in_stock" : "out_of_stock"),
});

const BYPRODUCT_COLUMNS = [
  {
    label: "Byproduct",
    sortField: "byProductName",
    render: (r) => (
      <span className="font-medium text-slate-800">{r.byProductName}</span>
    ),
  },
  { label: "Slug", sortField: "slug", render: (r) => r.slug },
  {
    label: "Total Qty",
    sortField: "totalQty",
    render: (r) => (
      <span className="font-semibold text-slate-900">
        {gmToKgDisplay(r.totalQtyGm)} kg
      </span>
    ),
  },
  { label: "Status", sortField: null, render: (r) => statusBadge(r.status) },
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

/* ----------------------------------- page ---------------------------------- */

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

export default function Product() {
  const [tab, setTab] = useState("items");
  const [sheets, setSheets] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyProductionForm);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Load available sheets (raw-material inventory) for the drawer.
  useEffect(() => {
    let alive = true;
    const rmOf = (res) => {
      const d = res?.data?.data ?? {};
      return Array.isArray(d) ? d : (d.rawMaterials ?? []);
    };
    async function loadSheets() {
      try {
        const first = await GetRawMaterials({ page: 1, limit: 100 });
        const all = [...rmOf(first)];
        const pages = Math.min(
          first?.data?.meta?.pagination?.totalPages ?? 1,
          20,
        );
        if (pages > 1) {
          const rest = await Promise.all(
            Array.from({ length: pages - 1 }, (_, i) =>
              GetRawMaterials({ page: i + 2, limit: 100 })
                .then(rmOf)
                .catch(() => []),
            ),
          );
          rest.forEach((arr) => all.push(...arr));
        }
        if (alive) {
          setSheets(
            all
              .map((s) => ({
                id: s._id ?? s.id,
                name:
                  s.rawMaterialName ||
                  [s.size, s.point, s.grade].filter(Boolean).join(" "),
                size: s.size ?? "",
                point: s.point ?? "",
                grade: s.grade ?? "",
                totalQtyGm: s.totalQty ?? 0,
              }))
              .filter((s) => s.id && s.name),
          );
        }
      } catch {
        if (alive) toast.error("Couldn't load sheets");
      }
    }
    loadSheets();
    return () => {
      alive = false;
    };
  }, []);

  function openAdd() {
    setMode("add");
    setEditingId(null);
    setForm(emptyProductionForm());
    setDrawerOpen(true);
  }

  async function openEdit(id) {
    try {
      const res = await getProductionById(id);
      const d = res?.data?.data ?? res?.data ?? {};
      setForm(productionToForm(d));
      setMode("edit");
      setEditingId(id);
      setDrawerOpen(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load production");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = buildProductionPayload(form);
      if (mode === "add") {
        await createProduction(payload);
        toast.success("Product added");
      } else {
        await updateProduction(editingId, payload);
        toast.success("Production updated");
      }
      setDrawerOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save production");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5 space-y-4 lg:space-y-5">
      <div className="max-w-[1400px] mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Product
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Cut products from raw material sheets and track byproduct stock.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1E4D96] hover:bg-[#1A3F7A] active:bg-[#15356A] text-white font-medium text-sm px-5 py-2.5 shadow-sm shadow-blue-200 transition-colors w-full sm:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1E4D96]/50"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Product
          </button>
        </div>

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
          <ProductionRecords onEdit={openEdit} reloadKey={reloadKey} />
        ) : (
          <InventoryTab
            fetchFn={GetByProducts}
            extract={extractByProducts}
            normalize={normalizeByProduct}
            columns={BYPRODUCT_COLUMNS}
            statCards={byproductStats}
            searchPlaceholder="Search byproduct name or slug"
            reloadKey={reloadKey}
          />
        )}
      </div>

      <ProductionDrawer
        open={drawerOpen}
        mode={mode}
        formState={form}
        setFormState={setForm}
        sheets={sheets}
        saving={saving}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSave}
      />
    </div>
  );
}
