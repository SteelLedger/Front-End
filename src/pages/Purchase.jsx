import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
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
import { usePageHeader } from "../context/pageHeader";
import AddPartyDrawer from "../components/AddPartyDrawer";
import ConfirmDialog from "../components/ConfirmDialog";
import { emptyPartyForm, buildPartyPayload } from "../utils/party";
import { gmToKgDisplay } from "../utils/units";
import {
  SORTABLE_FIELDS,
  emptyPurchaseForm,
  buildPurchasePayload,
  normalizePurchase,
  purchaseToForm,
  extractPurchases,
  lineLabel,
} from "../utils/purchase";
import {
  GetParties,
  createParty,
  GetPurchases,
  createPurchase,
  updatePurchase,
  DeletePurchase,
} from "../services/apiServices";

const PAGE_SIZE = 10;

// How many item lines show before a bill collapses the rest behind "+N more".
const COLLAPSED_LINES = 2;

/** The item lines on a bill, collapsed to the first couple until expanded. */
function PurchaseLines({ lines = [], expanded, onToggle }) {
  if (!lines.length) return <span className="text-slate-400">—</span>;
  const shown = expanded ? lines : lines.slice(0, COLLAPSED_LINES);
  const hidden = lines.length - shown.length;

  return (
    <div className="space-y-1">
      {shown.map((l, i) => (
        <div
          key={i}
          className="flex items-baseline gap-2 whitespace-nowrap text-xs"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E4D96]" />
          <span className="font-medium text-slate-700">{lineLabel(l)}</span>
          <span className="text-slate-400">
            {gmToKgDisplay(l.quantity || 0)} kg · {l.bundles || 0}{" "}
            {l.bundles === 1 ? "bundle" : "bundles"}
          </span>
        </div>
      ))}
      {(hidden > 0 || expanded) && (
        <button
          type="button"
          onClick={onToggle}
          className="text-xs font-semibold text-[#1E4D96] hover:underline"
        >
          {expanded ? "Show less" : `+${hidden} more`}
        </button>
      )}
    </div>
  );
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
        className={
          active && dir === "asc" ? "text-[#1E4D96]" : "text-slate-300"
        }
      />
      <ChevronDown
        size={12}
        strokeWidth={2.5}
        className={
          active && dir === "desc" ? "text-[#1E4D96]" : "text-slate-300"
        }
      />
    </span>
  );
}

function SortHeader({ label, field, sortBy, sortOrder, onSort, align }) {
  return (
    <th
      className={`py-3 px-4 font-semibold ${align === "right" ? "text-right" : ""}`}
    >
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
  // { fromDate, toDate } as DD/MM/YYYY — empty until a period is picked.
  const [dateRange, setDateRange] = useState({});

  usePageHeader({
    actionLabel: "Add Purchase",
    onAction: () => openAddDrawer(),
    dateFilter: true,
    onDateChange: (range) => {
      setDateRange(range);
      setPage(1);
    },
  });

  // Drawer / form state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState("add"); // "add" | "edit"
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(emptyPurchaseForm);
  const [saving, setSaving] = useState(false);

  const [confirmState, setConfirmState] = useState(null);
  // Which bill has its full item breakdown open.
  const [expandedId, setExpandedId] = useState(null);

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
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
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
  }, [debouncedQuery, dateRange, sortBy, sortOrder, page]);

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
        // Only suppliers belong in a purchase's supplier picker.
        const first = await GetParties({
          filter: ["supplier"],
          page: 1,
          limit: 100,
        });
        const all = [...partiesOf(first)];
        const totalPages = Math.min(
          first?.data?.meta?.pagination?.totalPages ?? 1,
          20,
        );
        if (totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              GetParties({ filter: ["supplier"], page: i + 2, limit: 100 })
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
    // The API dropped the per-line sort keys when bills went multi-item.
    if (!SORTABLE_FIELDS.includes(field)) return;
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
    setFormState(emptyPurchaseForm());
    setDrawerOpen(true);
  }

  function openEditDrawer(p) {
    setMode("edit");
    setEditingId(p.id);
    setFormState(purchaseToForm(p));
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
    // Anything added from here is a supplier by definition.
    setPartyForm({
      ...emptyPartyForm("supplier"),
      name: formState.supplier.trim(),
    });
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
        {/* Stats strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            label="Total Bundles"
            value={String(summary.totalBundles ?? 0)}
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
            <h2 className="text-base font-semibold text-slate-900">
              Purchases
            </h2>
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
              {/* Phones get cards — this table needs 760px to breathe. */}
              <div className="divide-y divide-slate-100 xl:hidden">
                {purchases.map((p) => (
                  <div key={p.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">
                          {p.supplier || "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {p.invoiceNumber || "—"} · {p.date || "—"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(p)}
                          aria-label={`Edit purchase ${p.invoiceNumber}`}
                          className="rounded-md p-2.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#1E4D96]"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(p)}
                          aria-label={`Delete purchase ${p.invoiceNumber}`}
                          className="rounded-md p-2.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2">
                      <PurchaseLines
                        lines={p.lineItems}
                        expanded={expandedId === p.id}
                        onToggle={() =>
                          setExpandedId((id) => (id === p.id ? null : p.id))
                        }
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Bundles:{" "}
                        <span className="font-semibold text-slate-700">
                          {p.totalBundles || 0}
                        </span>
                      </span>
                      <span className="font-semibold text-slate-800">
                        {gmToKgDisplay(p.totalQuantity || 0)} kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                      <SortHeader
                        label="Invoice #"
                        field="invoiceNumber"
                        {...sortProps}
                      />
                      <th className="py-3 px-4 font-semibold">Supplier</th>
                      <SortHeader label="Date" field="date" {...sortProps} />
                      <th className="py-3 px-4 font-semibold">Items</th>
                      <SortHeader
                        label="Bundles"
                        field="totalBundles"
                        align="right"
                        {...sortProps}
                      />
                      <SortHeader
                        label="Qty"
                        field="totalQuantity"
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
                          <PurchaseLines
                            lines={p.lineItems}
                            expanded={expandedId === p.id}
                            onToggle={() =>
                              setExpandedId((id) => (id === p.id ? null : p.id))
                            }
                          />
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          {p.totalBundles || 0}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-800 whitespace-nowrap">
                          {gmToKgDisplay(p.totalQuantity || 0)} kg
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
                      onClick={() =>
                        setPage((n) => Math.min(totalPages, n + 1))
                      }
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
        lockPartyType
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
