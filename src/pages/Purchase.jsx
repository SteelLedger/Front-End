import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  Layers,
  Boxes,
  Package,
  Inbox,
  Loader2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import RawMaterialDrawer from "../components/RawMaterialDrawer";
import AddPartyDrawer from "../components/AddPartyDrawer";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  emptyPartyForm,
  buildPartyPayload,
  todayISO,
  isoToDMY,
  dmyToISO,
} from "../utils/party";
import { kgToGm, gmToKg, gmToKgDisplay } from "../utils/units";
import {
  GetParties,
  createParty,
  GetPurchases,
  createPurchase,
  updatePurchase,
  DeletePurchase,
} from "../services/apiServices";

const PAGE_SIZE = 10;

function emptySheetForm() {
  return {
    partyId: "",
    supplier: "", // supplier display name
    invoiceNumber: "",
    date: todayISO(),
    size: "",
    point: "",
    grade: "",
    quantity: "",
    error: "",
    errorFields: [],
  };
}

function normalizePurchase(raw) {
  return {
    id: raw._id ?? raw.id,
    partyId:
      (typeof raw.partyId === "object" ? raw.partyId?._id : raw.partyId) ?? "",
    supplier: raw.supplierName ?? raw.supplier ?? "",
    invoiceNumber: raw.invoiceNumber ?? "",
    date: raw.date ?? "",
    size: raw.size ?? "",
    point: raw.point ?? "",
    grade: raw.grade ?? "",
    rawMaterialName: raw.rawMaterialName ?? "",
    quantity: raw.quantity ?? 0,
  };
}

// Dig the list + summary + total out of the response envelope.
function extractPurchases(res) {
  const body = res?.data ?? {};
  const d = body.data ?? {};
  const list = Array.isArray(d) ? d : (d.purchases ?? d.results ?? []);
  const summary = (Array.isArray(d) ? {} : d.summary) ?? {};
  const total = body.meta?.pagination?.total ?? (Array.isArray(list) ? list.length : 0);
  return {
    list: Array.isArray(list) ? list : [],
    summary,
    total: Number(total) || 0,
  };
}

function buildPurchasePayload(f) {
  return {
    partyId: f.partyId,
    invoiceNumber: f.invoiceNumber.trim(),
    date: isoToDMY(f.date),
    size: String(f.size).trim(),
    point: String(f.point).trim(),
    grade: String(f.grade).trim(),
    quantity: kgToGm(f.quantity), // UI kg -> backend grams
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

function SortIcon({ active, dir }) {
  return (
    <span className="inline-flex flex-col -space-y-[5px] leading-none">
      <ChevronUp
        size={12}
        strokeWidth={2.5}
        className={active && dir === "asc" ? "text-[#1E4D96]" : "text-slate-300"}
      />
      <ChevronDown
        size={12}
        strokeWidth={2.5}
        className={active && dir === "desc" ? "text-[#1E4D96]" : "text-slate-300"}
      />
    </span>
  );
}

function SortHeader({ label, field, sortBy, sortOrder, onSort, align }) {
  return (
    <th className={`py-3 px-4 font-semibold ${align === "right" ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 hover:text-slate-700 ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        {label}
        <SortIcon active={sortBy === field} dir={sortOrder} />
      </button>
    </th>
  );
}

export default function Purchase() {
  // Server-driven list state
  const [purchases, setPurchases] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);

  // Drawer / form state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState("add"); // "add" | "edit"
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(emptySheetForm);
  const [saving, setSaving] = useState(false);

  const [confirmState, setConfirmState] = useState(null);

  // Suppliers (parties) for the drawer dropdown.
  const [suppliers, setSuppliers] = useState([]);

  // Add-supplier party drawer (reuses the Parties create flow).
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyForm, setPartyForm] = useState(emptyPartyForm);
  const [partySaving, setPartySaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Debounce the search box (and reset to page 1).
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [query]);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const res = await GetPurchases({
        search: debouncedQuery,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
        page,
        limit: PAGE_SIZE,
      });
      const { list, summary: s, total: t } = extractPurchases(res);
      setPurchases(list.map(normalizePurchase));
      setSummary(s);
      setTotal(t);
    } catch (err) {
      setPurchases([]);
      setListError("Couldn't load purchases.");
      toast.error(err?.response?.data?.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, sortBy, sortOrder, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPurchases();
  }, [fetchPurchases]);

  // Load ALL parties once for the supplier dropdown. The list endpoint caps
  // `limit` at 100, so page through every page (bounded) and accumulate.
  useEffect(() => {
    let alive = true;
    const partiesOf = (res) => {
      const d = res?.data?.data ?? res?.data ?? [];
      return Array.isArray(d) ? d : (d.parties ?? []);
    };
    async function loadSuppliers() {
      try {
        const first = await GetParties({ page: 1, limit: 100 });
        const all = [...partiesOf(first)];
        const totalPages = Math.min(
          first?.data?.meta?.pagination?.totalPages ?? 1,
          20,
        );
        if (totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              GetParties({ page: i + 2, limit: 100 })
                .then(partiesOf)
                .catch(() => []),
            ),
          );
          rest.forEach((arr) => all.push(...arr));
        }
        if (alive) {
          setSuppliers(
            all
              .map((p) => ({ id: p._id ?? p.id, name: p.name || "" }))
              .filter((s) => s.id && s.name),
          );
        }
      } catch {
        if (alive) toast.error("Couldn't load suppliers");
      }
    }
    loadSuppliers();
    return () => {
      alive = false;
    };
  }, []);

  function toggleSort(field) {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  }

  function openAddDrawer() {
    setMode("add");
    setEditingId(null);
    setFormState(emptySheetForm());
    setDrawerOpen(true);
  }

  function openEditDrawer(p) {
    setMode("edit");
    setEditingId(p.id);
    setFormState({
      partyId: p.partyId || "",
      supplier: p.supplier || "",
      invoiceNumber: p.invoiceNumber || "",
      date: p.date ? dmyToISO(p.date) : todayISO(),
      // stored grams -> kg for the input
      size: p.size || "",
      point: p.point || "",
      grade: p.grade || "",
      quantity: p.quantity != null ? gmToKg(p.quantity) : "",
      error: "",
      errorFields: [],
    });
    setDrawerOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!formState.partyId) return; // drawer surfaces the field errors
    setSaving(true);
    try {
      const payload = buildPurchasePayload(formState);
      if (mode === "add") {
        await createPurchase(payload);
        toast.success("Purchase added");
        setPage(1);
      } else {
        await updatePurchase(editingId, payload);
        toast.success("Purchase updated");
      }
      await fetchPurchases();
      setDrawerOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save purchase");
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(p) {
    setConfirmState({
      title: "Delete purchase?",
      message: `Delete invoice "${p.invoiceNumber}" from "${p.supplier}"? This can't be undone.`,
      confirmLabel: "Yes, delete",
      onConfirm: () => doDelete(p),
    });
  }

  async function doDelete(p) {
    try {
      await DeletePurchase(p.id);
      toast.success("Purchase deleted");
      if (purchases.length === 1 && page > 1) setPage((n) => n - 1);
      else fetchPurchases();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't delete purchase");
    }
  }

  // Open the party drawer to create a new supplier, carrying over whatever the
  // user had already typed into the supplier field as the party name.
  function openAddSupplier() {
    setPartyForm({ ...emptyPartyForm(), name: formState.supplier.trim() });
    setPartyOpen(true);
  }

  // Create a real party, then select it as the supplier on the purchase form.
  async function handleSaveSupplier(e) {
    e.preventDefault();
    const name = partyForm.name.trim();
    if (!name) return; // party drawer surfaces the required-name error
    setPartySaving(true);
    try {
      const res = await createParty(buildPartyPayload(partyForm));
      const created = res?.data?.data ?? {};
      const newId = created._id ?? created.id ?? "";
      setSuppliers((prev) => [{ id: newId, name }, ...prev]);
      setFormState((f) => ({
        ...f,
        supplier: name,
        partyId: newId,
        error: "",
        errorFields: [],
      }));
      toast.success("Supplier added");
      setPartyOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't add supplier");
    } finally {
      setPartySaving(false);
    }
  }

  const sortProps = { sortBy, sortOrder, onSort: toggleSort };

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
              Record incoming raw material (Patta) purchases from your suppliers
              and keep track of stock by size, point and grade.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddDrawer}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1E4D96] hover:bg-[#1A3F7A] active:bg-[#15356A] text-white font-medium text-sm px-5 py-2.5 shadow-sm shadow-blue-200 transition-colors w-full sm:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1E4D96]/50"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Purchase
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard
            icon={Layers}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Total Purchases"
            value={String(total)}
          />
          <StatCard
            icon={Boxes}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="Total Quantity (kg)"
            value={gmToKgDisplay(summary.totalQuantity || 0)}
          />
          <StatCard
            icon={Package}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            label="Sheet Types"
            value={String(summary.totalSheetTypes ?? 0)}
          />
        </div>

        {/* List panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Purchases</h2>
            <div className="relative w-full sm:w-80">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search supplier, invoice, grade, size…"
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

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : listError ? (
            <div className="flex flex-col items-center justify-center text-center py-16 text-rose-500">
              <p className="text-sm">{listError}</p>
              <button
                type="button"
                onClick={fetchPurchases}
                className="mt-2 text-[#1E4D96] font-medium hover:underline"
              >
                Retry
              </button>
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm">
                {debouncedQuery
                  ? "No purchases match your search."
                  : "No purchases yet. Add your first one."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                      <SortHeader label="Invoice #" field="invoiceNumber" {...sortProps} />
                      <th className="py-3 px-4 font-semibold">Supplier</th>
                      <SortHeader label="Date" field="date" {...sortProps} />
                      <SortHeader label="Size" field="size" {...sortProps} />
                      <SortHeader label="Point" field="point" {...sortProps} />
                      <SortHeader label="Grade" field="grade" {...sortProps} />
                      <SortHeader
                        label="Raw Material"
                        field="rawMaterialName"
                        {...sortProps}
                      />
                      <SortHeader
                        label="Qty"
                        field="quantity"
                        align="right"
                        {...sortProps}
                      />
                      <th className="py-3 px-4 font-semibold text-right w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {p.invoiceNumber || "—"}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {p.supplier || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {p.date || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {p.size || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {p.point || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {p.grade || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {p.rawMaterialName || "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-800">
                          {gmToKgDisplay(p.quantity || 0)} kg
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditDrawer(p)}
                              aria-label={`Edit purchase ${p.invoiceNumber}`}
                              title="Edit"
                              className="p-1.5 rounded-md text-slate-400 hover:text-[#1E4D96] hover:bg-blue-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDelete(p)}
                              aria-label={`Delete purchase ${p.invoiceNumber}`}
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((n) => Math.max(1, n - 1))}
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <RawMaterialDrawer
        open={drawerOpen}
        mode={mode}
        formState={formState}
        setFormState={setFormState}
        saving={saving}
        supplierOptions={suppliers}
        closeOnEscape={!partyOpen}
        onAddSupplier={openAddSupplier}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSave}
      />

      {/* Add-supplier drawer, stacked above the purchase drawer. */}
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
