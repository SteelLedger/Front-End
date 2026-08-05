import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Plus } from "lucide-react";
import ProductionDrawer from "../components/ProductionDrawer";
import ProductionRecords from "../components/ProductionRecords";
import { todayISO } from "../utils/party";
import { kgToGm, gmToKg } from "../utils/units";
import { BYPRODUCT_OPTIONS } from "../utils/byproducts";
import {
  GetRawMaterials,
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

  // productSize / productQty are an optional pair — omit both on a
  // byproduct-only run rather than sending "" and 0, which would read as
  // "size set, quantity missing" to the API.
  const size = String(form.productSize).trim();
  const hasProduct = size !== "" && Number(form.howMany) > 0;

  return {
    rawMaterialId: form.rawMaterialId,
    ...(hasProduct
      ? { productSize: size, productQty: kgToGm(form.howMany) }
      : {}),
    wasteQty: kgToGm(form.difference),
    productionDate: dateToISO(form.productionDate),
    byProducts,
  };
}

/* ----------------------------------- page ---------------------------------- */

export default function Product() {
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

        <ProductionRecords onEdit={openEdit} reloadKey={reloadKey} />
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
