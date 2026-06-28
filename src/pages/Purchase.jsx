import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import {
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  Layers,
  Boxes,
  Inbox,
} from "lucide-react";
import RawMaterialDrawer from "../components/RawMaterialDrawer";
import AddPartyDrawer from "../components/AddPartyDrawer";
import ConfirmDialog from "../components/ConfirmDialog";
import { emptyPartyForm, buildPartyPayload } from "../utils/party";
import { createParty } from "../services/apiServices";
import { useRawMaterials } from "../context/rawMaterialContext";

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function emptySheetForm() {
  return {
    supplier: "",
    date: todayISO(),
    size: "",
    point: "",
    grade: "",
    quantity: "",
    error: "",
  };
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
      <span
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-lg font-semibold truncate text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function Purchase() {
  const { sheets, addSheet, updateSheet, deleteSheet } = useRawMaterials();
  const [query, setQuery] = useState("");

  // Drawer / form state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState("add"); // "add" | "edit"
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(emptySheetForm);
  const [saving, setSaving] = useState(false);

  // Confirmation modal: { title, message, confirmLabel, onConfirm } | null
  const [confirmState, setConfirmState] = useState(null);

  // Add-supplier party drawer (reuses the Parties create flow).
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyForm, setPartyForm] = useState(emptyPartyForm);
  const [partySaving, setPartySaving] = useState(false);
  // Suppliers created via the + button this session (not yet reflected in sheets).
  const [addedSuppliers, setAddedSuppliers] = useState([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sheets;
    return sheets.filter((s) =>
      [s.supplier, s.size, s.point, s.grade]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(q)),
    );
  }, [sheets, query]);

  const totalQuantity = useMemo(
    () => sheets.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0),
    [sheets],
  );

  // Supplier names for the drawer's searchable dropdown: ones already used in
  // sheets plus any added via the + button this session. (Swap/extend with a
  // GET /parties fetch once that API is wired.)
  const supplierOptions = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const name of [...sheets.map((s) => s.supplier), ...addedSuppliers]) {
      const clean = (name || "").trim();
      const key = clean.toLowerCase();
      if (clean && !seen.has(key)) {
        seen.add(key);
        list.push(clean);
      }
    }
    return list.sort((a, b) => a.localeCompare(b));
  }, [sheets, addedSuppliers]);

  function openAddDrawer() {
    setMode("add");
    setEditingId(null);
    setFormState(emptySheetForm());
    setDrawerOpen(true);
  }

  function openEditDrawer(sheet) {
    setMode("edit");
    setEditingId(sheet.id);
    setFormState({
      supplier: sheet.supplier || "",
      date: sheet.date || todayISO(),
      size: sheet.size || "",
      point: sheet.point || "",
      grade: sheet.grade || "",
      quantity: sheet.quantity ?? "",
      error: "",
    });
    setDrawerOpen(true);
  }

  function handleSave(e) {
    e.preventDefault();
    if (!formState.supplier.trim()) return; // drawer surfaces the field error
    setSaving(true);
    const sheet = {
      supplier: formState.supplier.trim(),
      date: formState.date,
      size: formState.size.trim(),
      point: formState.point.trim(),
      grade: formState.grade.trim(),
      quantity: formState.quantity === "" ? "" : String(formState.quantity),
    };
    if (mode === "add") {
      addSheet(sheet);
      toast.success("Sheet added");
    } else {
      updateSheet(editingId, sheet);
      toast.success("Sheet updated");
    }
    setSaving(false);
    setDrawerOpen(false);
  }

  function requestDelete(sheet) {
    setConfirmState({
      title: "Delete sheet?",
      message: `Delete the raw material sheet from "${sheet.supplier}"? This can't be undone.`,
      confirmLabel: "Yes, delete",
      onConfirm: () => {
        deleteSheet(sheet.id);
        toast.success("Sheet deleted");
      },
    });
  }

  // Open the party drawer to create a new supplier, carrying over whatever the
  // user had already typed into the supplier field as the party name.
  function openAddSupplier() {
    setPartyForm({ ...emptyPartyForm(), name: formState.supplier.trim() });
    setPartyOpen(true);
  }

  // Create a real party, then select it as the supplier on the sheet form.
  async function handleSaveSupplier(e) {
    e.preventDefault();
    const name = partyForm.name.trim();
    if (!name) return; // party drawer surfaces the required-name error
    setPartySaving(true);
    try {
      await createParty(buildPartyPayload(partyForm));
      setAddedSuppliers((prev) => [...prev, name]);
      setFormState((f) => ({ ...f, supplier: name, error: "" }));
      toast.success("Supplier added");
      setPartyOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't add supplier");
    } finally {
      setPartySaving(false);
    }
  }

  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5 space-y-4 lg:space-y-5">
      <div className="max-w-[1400px] mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Raw Material
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Record incoming raw material (Patta) sheets from your suppliers
              and keep track of stock by size, point and grade.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddDrawer}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1E4D96] hover:bg-[#1A3F7A] active:bg-[#15356A] text-white font-medium text-sm px-5 py-2.5 shadow-sm shadow-blue-200 transition-colors w-full sm:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1E4D96]/50"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Raw Material
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <StatCard
            icon={Layers}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Total Sheets"
            value={String(sheets.length)}
          />
          <StatCard
            icon={Boxes}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="Total Quantity"
            value={totalQuantity.toLocaleString("en-IN")}
          />
        </div>

        {/* List panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Sheets List
            </h2>
            <div className="relative w-full sm:w-72">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search supplier, size, point, grade"
                className="w-full pl-9 pr-8 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E4D96]/30 focus:border-[#1E4D96] transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm">
                {sheets.length === 0
                  ? "No sheets yet. Add your first raw material sheet."
                  : "No sheets match your search."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                    <th className="py-3 px-4 font-semibold">ID</th>
                    <th className="py-3 px-4 font-semibold">Supplier</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Size</th>
                    <th className="py-3 px-4 font-semibold">Point</th>
                    <th className="py-3 px-4 font-semibold">Grade</th>
                    <th className="py-3 px-4 font-semibold">
                      Raw Material Name
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">Qty</th>
                    <th className="py-3 px-4 font-semibold text-right w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-slate-400">{s.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {s.supplier}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {s.date}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {s.size || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {s.point || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {s.grade || "—"}
                      </td>
                      <td className="py-3 px-4 w-44 text-slate-600">
                        10 *120p M5
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {s.quantity === "" ? "—" : s.quantity}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditDrawer(s)}
                            aria-label={`Edit sheet from ${s.supplier}`}
                            title="Edit"
                            className="p-1.5 rounded-md text-slate-400 hover:text-[#1E4D96] hover:bg-blue-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete(s)}
                            aria-label={`Delete sheet from ${s.supplier}`}
                            title="Delete"
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <RawMaterialDrawer
        open={drawerOpen}
        mode={mode}
        formState={formState}
        setFormState={setFormState}
        saving={saving}
        supplierOptions={supplierOptions}
        closeOnEscape={!partyOpen}
        onAddSupplier={openAddSupplier}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSave}
      />

      {/* Add-supplier drawer, stacked above the raw-material drawer. */}
      <AddPartyDrawer
        open={partyOpen}
        mode="add"
        formState={partyForm}
        setFormState={setPartyForm}
        saving={partySaving}
        loading={false}
        onClose={() => setPartyOpen(false)}
        onSubmit={handleSaveSupplier}
      />

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          const fn = confirmState?.onConfirm;
          setConfirmState(null);
          fn?.();
        }}
      />
    </div>
  );
}
