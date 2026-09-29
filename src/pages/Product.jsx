import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import ProductionDrawer from "../components/ProductionDrawer";
import ProductionRecords from "../components/ProductionRecords";
import { todayISO } from "../utils/party";
import { kgToGm, gmToKg } from "../utils/units";
import { numericText } from "../utils/text";
import { BYPRODUCT_OPTIONS } from "../utils/byproducts";
import {
  emptyProductionEntry,
  emptyBalancePatta,
  emptyByproduct,
  isBlankEntry,
} from "../utils/production";
import {
  GetRawMaterials,
  createProduction,
  updateProduction,
  getProductionById,
} from "../services/apiServices";

/* ------------------------------- form helpers ------------------------------ */

/**
 * The drawer form: one entry per product, each a complete production with its
 * own sheet, type and date, saved as its own record.
 */
function emptyProductionForm() {
  return {
    // The first opens expanded so its balance patta / byproduct fields are in
    // view; cards added after it start collapsed to keep the list scannable.
    entries: [emptyProductionEntry({ expanded: true })],
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

function balancePattaToForm(bp) {
  return {
    size: bp.size ?? "",
    qty: bp.qty != null ? gmToKg(bp.qty) : "",
  };
}

/**
 * A saved run's balance pattas. Runs recorded before the list existed carry a
 * single balancePattaSize/balancePattaQty pair instead — read as one row.
 */
function balancePattasOf(d) {
  if (Array.isArray(d.balancePattas)) return d.balancePattas;
  return d.balancePattaSize && d.balancePattaQty
    ? [{ size: d.balancePattaSize, qty: d.balancePattaQty }]
    : [];
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

/**
 * Map a production record (GET /productions/:id) back into the drawer form.
 * PUT still updates one record at a time, so an edit is always one entry.
 */
function productionToForm(d) {
  const rmId =
    typeof d.rawMaterialId === "object"
      ? d.rawMaterialId?._id
      : d.rawMaterialId;
  const pattas = balancePattasOf(d);
  return {
    entries: [
      emptyProductionEntry({
        rawMaterialId: rmId ?? "",
        // Null on runs recorded before the field existed; the drawer then asks
        // for one, which backfills it on save.
        productionType: d.productionType ?? "",
        productionDate: d.productionDate
          ? isoToDateInput(d.productionDate)
          : todayISO(),
        productSize: d.productSize ?? "",
        howMany: d.productQty != null ? gmToKg(d.productQty) : "",
        productBundles:
          d.productBundles != null ? String(d.productBundles) : "",
        wasteQty: d.wasteQty != null ? gmToKg(d.wasteQty) : "",
        balancePattas: pattas.length
          ? pattas.map(balancePattaToForm)
          : [emptyBalancePatta()],
        byproducts:
          Array.isArray(d.byProducts) && d.byProducts.length
            ? d.byProducts.map(byproductToForm)
            : [emptyByproduct()],
        expanded: true,
      }),
    ],
  };
}

/**
 * One drawer entry -> a single production body (one item of POST's
 * `productions`, or PUT's body).
 *
 * `balancePattas` is always sent, even empty: on an edit, leaving it out would
 * read as "don't touch these" and a deliberately removed offcut would outlive
 * its deletion.
 */
function buildEntryPayload(entry) {
  const byProducts = (entry.byproducts || [])
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
  const size = numericText(entry.productSize);
  const hasProduct = Number(size) > 0 && Number(entry.howMany) > 0;

  // Each balance patta creates/updates a raw-material row from its size plus
  // the source sheet's point and grade. Half-filled rows never get this far —
  // the drawer blocks submit on them — so only blank rows are dropped here.
  // Just { size, qty }: unlike byproducts, PUT replaces the whole list, so
  // there are no row ids to sync against.
  const balancePattas = (entry.balancePattas || [])
    .map((b) => ({
      size: numericText(b.size),
      qty: kgToGm(b.qty),
    }))
    .filter((b) => Number(b.size) > 0 && b.qty > 0);

  return {
    rawMaterialId: entry.rawMaterialId,
    productionType: entry.productionType,
    ...(hasProduct
      ? { productSize: size, productQty: kgToGm(entry.howMany) }
      : {}),
    ...(Number(entry.productBundles) > 0
      ? { productBundles: Number(entry.productBundles) }
      : {}),
    balancePattas,
    wasteQty: kgToGm(entry.wasteQty),
    productionDate: dateToISO(entry.productionDate),
    byProducts,
  };
}

/**
 * Drawer form -> POST /productions body: every filled entry becomes its own
 * record. Cards added and never touched are dropped; the drawer blocks submit
 * when that would leave nothing to save.
 */
function buildCreatePayload(form) {
  return {
    productions: form.entries
      .filter((e) => !isBlankEntry(e))
      .map(buildEntryPayload),
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
    balancePattasOf(d).reduce((sum, b) => sum + (Number(b.qty) || 0), 0) +
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
      if (mode === "add") {
        const payload = buildCreatePayload(form);
        await createProduction(payload);
        const n = payload.productions.length;
        toast.success(n > 1 ? `${n} products added` : "Product added");
      } else {
        await updateProduction(editingId, buildEntryPayload(form.entries[0]));
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
