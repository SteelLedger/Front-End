import { useState, useEffect } from "react";
import { toast } from "react-toastify";
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
    howMany: "", // kg -> productQty
    productBundles: "", // a count, not a weight
    wasteQty: "", // kg -> wasteQty (scrap; deducted and gone)
    // Balance patta returns usable material to raw-material stock at a new
    // size, so it carries its own size and is NOT waste.
    balancePattaSize: "",
    balancePattaQty: "", // kg
    productionDate: todayISO(),
    byproducts: [emptyByproduct()],
  };
}

function dateToISO(d) {
  const dt = new Date(`${d}T00:00:00.000Z`);
  return Number.isNaN(dt.getTime())
    ? new Date().toISOString()
    : dt.toISOString();
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
    typeof d.rawMaterialId === "object"
      ? d.rawMaterialId?._id
      : d.rawMaterialId;
  return {
    rawMaterialId: rmId ?? "",
    productSize: d.productSize ?? "",
    howMany: d.productQty != null ? gmToKg(d.productQty) : "",
    productBundles: d.productBundles != null ? String(d.productBundles) : "",
    wasteQty: d.wasteQty != null ? gmToKg(d.wasteQty) : "",
    balancePattaSize: d.balancePattaSize ?? "",
    balancePattaQty: d.balancePattaQty != null ? gmToKg(d.balancePattaQty) : "",
    productionDate: d.productionDate
      ? isoToDateInput(d.productionDate)
      : todayISO(),
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
      byProductName: b.name === "Other" ? (b.customName || "").trim() : b.name,
      qty: kgToGm(b.qty),
    }))
    .filter((b) => b.byProductName && b.qty > 0);

  // productSize / productQty are an optional PAIR — omit both on a byproduct-only
  // run rather than sending "" and 0, which would read as "size set, quantity
  // missing" to the API. productBundles is independent: the backend stores it on
  // the production record only and no longer requires it alongside the pair.
  const size = String(form.productSize).trim();
  const hasProduct = size !== "" && Number(form.howMany) > 0;

  // Balance patta is its own optional pair, and creates/updates a raw-material
  // row from this size plus the source sheet's point and grade.
  const balanceSize = String(form.balancePattaSize).trim();
  const hasBalancePatta =
    balanceSize !== "" && Number(form.balancePattaQty) > 0;

  return {
    rawMaterialId: form.rawMaterialId,
    ...(hasProduct
      ? { productSize: size, productQty: kgToGm(form.howMany) }
      : {}),
    ...(Number(form.productBundles) > 0
      ? { productBundles: Number(form.productBundles) }
      : {}),
    ...(hasBalancePatta
      ? {
          balancePattaSize: balanceSize,
          balancePattaQty: kgToGm(form.balancePattaQty),
        }
      : {}),
    wasteQty: kgToGm(form.wasteQty),
    productionDate: dateToISO(form.productionDate),
    byProducts,
  };
}

/* ---------------------------------- sheets --------------------------------- */

function toSheet(s) {
  return {
    id: s._id ?? s.id,
    name:
      s.rawMaterialName || [s.size, s.point, s.grade].filter(Boolean).join(" "),
    size: s.size ?? "",
    point: s.point ?? "",
    grade: s.grade ?? "",
    totalQtyGm: s.totalQty ?? 0,
  };
}

/**
 * The sheet a saved run was cut from. The drawer only offers in-stock sheets,
 * so a run whose source has since dropped to zero would open with an empty
 * Select Sheet — this puts its own sheet back on the list for that edit.
 */
function sheetFromProduction(d) {
  const rm = typeof d.rawMaterialId === "object" ? d.rawMaterialId : null;
  const id = rm?._id ?? d.rawMaterialId;
  if (!id) return null;
  const sheet = toSheet({
    ...(rm ?? {}),
    _id: id,
    rawMaterialName: rm?.rawMaterialName ?? d.rawMaterialName,
  });
  return sheet.name ? sheet : null;
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

  // Load the sheets the drawer can cut from. Only in-stock rows: a sheet at
  // zero has nothing left to cut, so offering it only invites a failed save.
  useEffect(() => {
    let alive = true;
    const rmOf = (res) => {
      const d = res?.data?.data ?? {};
      return Array.isArray(d) ? d : (d.rawMaterials ?? []);
    };
    async function loadSheets() {
      try {
        const query = { status: "in_stock", limit: 100 };
        const first = await GetRawMaterials({ ...query, page: 1 });
        const all = [...rmOf(first)];
        const pages = Math.min(
          first?.data?.meta?.pagination?.totalPages ?? 1,
          20,
        );
        if (pages > 1) {
          const rest = await Promise.all(
            Array.from({ length: pages - 1 }, (_, i) =>
              GetRawMaterials({ ...query, page: i + 2 })
                .then(rmOf)
                .catch(() => []),
            ),
          );
          rest.forEach((arr) => all.push(...arr));
        }
        if (alive) {
          setSheets(all.map(toSheet).filter((s) => s.id && s.name));
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
      const own = sheetFromProduction(d);
      if (own) {
        setSheets((prev) =>
          prev.some((s) => s.id === own.id) ? prev : [...prev, own],
        );
      }
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
        <ProductionRecords
          onEdit={openEdit}
          onAddProduct={openAdd}
          reloadKey={reloadKey}
        />
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
