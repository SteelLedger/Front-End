import { useState, useEffect, useCallback, useMemo } from "react";
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

/**
 * Drawer form -> POST /productions or PUT /productions/:id body.
 *
 * `isEdit` decides what a cleared optional pair means. On a create there is
 * nothing to clear, so an empty pair is simply left out. On an edit, leaving
 * the keys out reads as "don't touch these" and the balance-patta row the run
 * created would outlive a deliberate deletion — so a cleared pair is sent as
 * an explicit null instead.
 */
function buildProductionPayload(form, { isEdit = false } = {}) {
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
  const hasProduct = Number(size) > 0 && Number(form.howMany) > 0;

  // Balance patta is its own optional pair, and creates/updates a raw-material
  // row from this size plus the source sheet's point and grade.
  const balanceSize = String(form.balancePattaSize).trim();
  const hasBalancePatta =
    Number(balanceSize) > 0 && Number(form.balancePattaQty) > 0;

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
      : isEdit
        ? { balancePattaSize: null, balancePattaQty: null }
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

/**
 * Grams a saved run took out of its sheet: the product, its byproducts, the
 * balance patta returned at a new size, and the waste. Editing that run frees
 * all of it again, which is what makes the sheet's remaining weight add up.
 */
function consumedGm(d) {
  const byProducts = Array.isArray(d.byProducts) ? d.byProducts : [];
  return (
    (Number(d.productQty) || 0) +
    byProducts.reduce((sum, b) => sum + (Number(b.qty) || 0), 0) +
    (Number(d.balancePattaQty) || 0) +
    (Number(d.wasteQty) || 0)
  );
}

/* ----------------------------------- page ---------------------------------- */

export default function Product() {
  const [sheets, setSheets] = useState([]);
  // The sheet an edited run was cut from, when it has since gone to zero and
  // so is missing from the in-stock list. Held apart from `sheets` so that a
  // refresh can't drop it and so it never leaks into the next Add.
  const [editSheet, setEditSheet] = useState(null);
  // { sheetId, gm } — what the run being edited already took out of its sheet.
  const [sheetCredit, setSheetCredit] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyProductionForm);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  /**
   * The sheets the drawer can cut from. Only in-stock rows: a sheet at zero has
   * nothing left to cut, so offering it only invites a failed save.
   *
   * Every production changes these weights, so this is re-run after each save
   * and delete rather than loaded once — a cached list would keep showing the
   * pre-production weight until the page was reloaded.
   */
  const loadSheets = useCallback(async () => {
    const rmOf = (res) => {
      const d = res?.data?.data ?? {};
      return Array.isArray(d) ? d : (d.rawMaterials ?? []);
    };
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
      setSheets(all.map(toSheet).filter((s) => s.id && s.name));
    } catch {
      toast.error("Couldn't load sheets");
    }
  }, []);

  useEffect(() => {
    // Legitimate data-fetch on mount — same exemption the list pages take.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSheets();
  }, [loadSheets]);

  const sheetOptions = useMemo(
    () =>
      !editSheet || sheets.some((s) => s.id === editSheet.id)
        ? sheets
        : [...sheets, editSheet],
    [sheets, editSheet],
  );

  function openAdd() {
    setMode("add");
    setEditingId(null);
    setEditSheet(null);
    setSheetCredit(null);
    setForm(emptyProductionForm());
    setDrawerOpen(true);
    // Another member may have cut from these sheets since the page loaded.
    loadSheets();
  }

  async function openEdit(id) {
    try {
      const res = await getProductionById(id);
      const d = res?.data?.data ?? res?.data ?? {};
      const own = sheetFromProduction(d);
      setEditSheet(own);
      // This run's own consumption is already out of the sheet's stock, so the
      // drawer adds it back before working out what is left to allocate.
      setSheetCredit(own ? { sheetId: own.id, gm: consumedGm(d) } : null);
      setForm(productionToForm(d));
      setMode("edit");
      setEditingId(id);
      setDrawerOpen(true);
      loadSheets();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load production");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = buildProductionPayload(form, { isEdit: mode === "edit" });
      if (mode === "add") {
        await createProduction(payload);
        toast.success("Product added");
      } else {
        await updateProduction(editingId, payload);
        toast.success("Production updated");
      }
      setDrawerOpen(false);
      setReloadKey((k) => k + 1);
      // The run just changed how much of its sheet is left.
      loadSheets();
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
          onDeleted={loadSheets}
          reloadKey={reloadKey}
        />
      </div>

      <ProductionDrawer
        open={drawerOpen}
        mode={mode}
        formState={form}
        setFormState={setForm}
        sheets={sheetOptions}
        sheetCredit={sheetCredit}
        saving={saving}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSave}
      />
    </div>
  );
}
