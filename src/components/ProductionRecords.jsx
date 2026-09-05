import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  Search,
  X,
  Inbox,
  Loader2,
  Pencil,
  Trash2,
  Package,
  Boxes,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import ByproductsModal from "./ByproductsModal";
import { usePageHeader } from "../context/pageHeader";
import { defaultDateRange } from "../utils/dateRange";
import {
  GetProductions,
  DeleteProduction,
  getProductionById,
} from "../services/apiServices";
import { gmToKgDisplay } from "../utils/units";

const PAGE_SIZE = 10;

function normalizeProduction(raw) {
  return {
    id: raw._id ?? raw.id,
    productName: raw.productName || "—",
    rawMaterialName: raw.rawMaterialName || "—",
    productSize: raw.productSize || "—",
    productQtyGm: raw.totalQty ?? 0,
    wasteQtyGm: raw.wasteQty ?? 0,
    productionDate: raw.productionDate || "",
    byProducts: Array.isArray(raw.byProducts) ? raw.byProducts : [],
  };
}

/**
 * ByproductsToggle
 * Opens the byproducts dialog for one run. It carries the count when the list
 * response gave us one — worth seeing before clicking — and falls back to a
 * plain label when it didn't. A row known to have none reads as flat text,
 * since there is nothing behind it to open.
 *
 * Spacing is the caller's: the table sets it beside the product name, the
 * card sets it underneath.
 */
function ByproductsToggle({ count, onClick, className = "" }) {
  if (count === 0) {
    return (
      <span className={`text-[11px] text-slate-300 ${className}`}>
        No byproducts
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title="View byproducts"
      className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:bg-blue-50 hover:text-[#1E4D96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40 ${className}`}
    >
      <Boxes size={12} />
      {count == null
        ? "Byproducts"
        : `${count} byproduct${count === 1 ? "" : "s"}`}
    </button>
  );
}

function extractProductions(res) {
  const body = res?.data ?? {};
  const d = body.data ?? {};
  const list = Array.isArray(d) ? d : (d.productions ?? []);
  const summary = (Array.isArray(d) ? {} : d.summary) ?? {};
  const total =
    body.meta?.pagination?.total ?? (Array.isArray(list) ? list.length : 0);
  return {
    list: Array.isArray(list) ? list : [],
    summary,
    total: Number(total) || 0,
  };
}

function fmtDate(iso) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(dt.getUTCDate())}/${pad(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear()}`;
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
        className={`inline-flex items-center gap-1 hover:text-slate-700 ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        <SortIcon active={sortBy === field} dir={sortOrder} />
      </button>
    </th>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
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

/**
 * ProductionRecords
 * Server-driven list of production records (GET /productions) with edit/delete.
 * `onEdit(id)` opens the parent's drawer in edit mode; `reloadKey` triggers a
 * refetch after an external add/edit.
 */
export default function ProductionRecords({
  onEdit,
  onAddProduct,
  onDeleted,
  reloadKey,
}) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  // { fromDate, toDate } as DD/MM/YYYY — opens on the current month.
  const [dateRange, setDateRange] = useState(defaultDateRange);

  // The Product page owns the topbar action; this only adds the date filter.
  usePageHeader({
    actionLabel: "Add Product",
    onAction: onAddProduct,
    dateFilter: true,
    onDateChange: (range) => {
      setDateRange(range);
      setPage(1);
    },
  });

  const [confirmState, setConfirmState] = useState(null);
  // Byproducts dialog: { loading, productName, byProducts } | null
  const [viewState, setViewState] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /**
   * The list response normally carries `byProducts` on every row, so a count
   * is known up front and a 0 really means none. If nothing on the page has
   * any, that could equally mean this endpoint stopped returning them — so
   * rather than claiming "no byproducts" across the board, the rows stay
   * openable and the dialog fetches its own detail.
   */
  const countsAreKnown = rows.some((r) => r.byProducts.length > 0);
  const countFor = (row) =>
    countsAreKnown || row.byProducts.length ? row.byProducts.length : null;

  async function openByproducts(row) {
    // Rows the list already gave us byproducts for open with no round trip.
    if (row.byProducts.length) {
      setViewState({
        loading: false,
        productName: row.productName,
        byProducts: row.byProducts,
      });
      return;
    }
    setViewState({
      loading: true,
      productName: row.productName,
      byProducts: [],
    });
    try {
      const res = await getProductionById(row.id);
      const d = res?.data?.data ?? res?.data ?? {};
      setViewState({
        loading: false,
        productName: d.productName || row.productName,
        byProducts: Array.isArray(d.byProducts) ? d.byProducts : [],
      });
    } catch {
      setViewState({
        loading: false,
        productName: row.productName,
        byProducts: [],
      });
    }
  }

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await GetProductions({
        search: debounced,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
        page,
        limit: PAGE_SIZE,
      });
      const { list, summary: s, total: t } = extractProductions(res);
      setRows(list.map(normalizeProduction));
      setSummary(s);
      setTotal(t);
    } catch {
      setRows([]);
      setError("Couldn't load productions.");
    } finally {
      setLoading(false);
    }
  }, [debounced, dateRange, sortBy, sortOrder, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, reloadKey]);

  function toggleSort(field) {
    if (!field) return;
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  }

  function requestDelete(row) {
    setConfirmState({
      title: "Delete production?",
      message: `Delete "${row.productName}"? This restores the deducted raw material stock and can't be undone.`,
      confirmLabel: "Yes, delete",
      onConfirm: () => doDelete(row),
    });
  }

  async function doDelete(row) {
    try {
      await DeleteProduction(row.id);
      toast.success("Production deleted");
      // Deleting restores the sheet's stock, so the parent's sheet list is now
      // out of date too.
      onDeleted?.();
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't delete production");
    }
  }

  const sortProps = { sortBy, sortOrder, onSort: toggleSort };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4 sm:max-w-md">
        <StatCard
          icon={Boxes}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Total Qty (kg)"
          value={gmToKgDisplay(summary.totalQuantity || 0)}
        />
        <StatCard
          icon={Package}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          label="Product Types"
          value={String(summary.totalProductTypes ?? 0)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            Production Records
          </h2>
          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product, size, raw material"
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
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center py-16 text-rose-500">
            <p className="text-sm">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-2 text-[#1E4D96] font-medium hover:underline"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 text-slate-400">
            <Inbox size={32} className="mb-2" />
            <p className="text-sm">
              {debounced
                ? "No productions match your search."
                : "No productions in this period. Click Add Product to cut your first one."}
            </p>
          </div>
        ) : (
          <>
            {/* Phones get cards — the table needs 760px. */}
            <div className="divide-y divide-slate-100 xl:hidden">
              {rows.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">
                        {r.productName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        from {r.rawMaterialName} · {fmtDate(r.productionDate)}
                      </p>
                      <ByproductsToggle
                        className="mt-1.5"
                        count={countFor(r)}
                        onClick={() => openByproducts(r)}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(r.id)}
                        aria-label="Edit production"
                        className="rounded-md p-2.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#1E4D96]"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(r)}
                        aria-label="Delete production"
                        className="rounded-md p-2.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <dl className="mt-2.5 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <div>
                      <dt className="text-slate-400">Size</dt>
                      <dd className="mt-0.5 font-semibold text-slate-700">
                        {r.productSize || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Produced</dt>
                      <dd className="mt-0.5 font-semibold text-slate-900">
                        {gmToKgDisplay(r.productQtyGm)} kg
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Waste</dt>
                      <dd className="mt-0.5 font-semibold text-slate-700">
                        {gmToKgDisplay(r.wasteQtyGm)} kg
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                    <SortHeader
                      label="Product"
                      field="productName"
                      {...sortProps}
                    />
                    <th className="py-3 px-4 font-semibold">
                      Raw Material Sheet
                    </th>
                    <SortHeader
                      label="Size"
                      field="productSize"
                      {...sortProps}
                    />
                    <SortHeader
                      label="Total Used Product Qty"
                      field="productQty"
                      {...sortProps}
                    />
                    <th className="py-3 px-4 font-semibold">Waste</th>
                    <SortHeader
                      label="Date"
                      field="productionDate"
                      {...sortProps}
                    />
                    <th className="py-3 px-4 font-semibold text-right w-28">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 align-top">
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2.5">
                          {r.productName}
                          <ByproductsToggle
                            count={countFor(r)}
                            onClick={() => openByproducts(r)}
                          />
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {r.rawMaterialName}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.productSize}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {gmToKgDisplay(r.productQtyGm)} kg
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {gmToKgDisplay(r.wasteQtyGm)} kg
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {fmtDate(r.productionDate)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit(r.id)}
                            aria-label="Edit production"
                            title="Edit"
                            className="p-1.5 rounded-md text-slate-400 hover:text-[#1E4D96] hover:bg-blue-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete(r)}
                            aria-label="Delete production"
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
                    className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
                    className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
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

      <ByproductsModal state={viewState} onClose={() => setViewState(null)} />

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
