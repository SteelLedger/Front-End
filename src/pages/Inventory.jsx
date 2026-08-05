import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  X,
  Boxes,
  PackageCheck,
  PackageX,
  Inbox,
  Loader2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AddPurchase from "../components/AddPurchase";
import { GetRawMaterials } from "../services/apiServices";
import { gmToKgDisplay } from "../utils/units";

const PAGE_SIZE = 10;

function normalizeRawMaterial(raw) {
  const totalQty = Number(raw.totalQty ?? raw.quantity ?? 0) || 0;
  return {
    id: raw._id ?? raw.id,
    size: raw.size ?? "",
    point: raw.point ?? "",
    grade: raw.grade ?? "",
    rawMaterialName: raw.rawMaterialName ?? "",
    totalQty,
    status: raw.status ?? (totalQty > 0 ? "in_stock" : "out_of_stock"),
  };
}

// Dig the list + summary + total out of the response envelope.
function extractRawMaterials(res) {
  const body = res?.data ?? {};
  const d = body.data ?? {};
  const list = Array.isArray(d) ? d : (d.rawMaterials ?? d.results ?? []);
  const summary = (Array.isArray(d) ? {} : d.summary) ?? {};
  const total =
    body.meta?.pagination?.total ?? (Array.isArray(list) ? list.length : 0);
  return {
    list: Array.isArray(list) ? list : [],
    summary,
    total: Number(total) || 0,
  };
}

const dash = (v) => (v && String(v).trim() ? v : "—");

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

function SortHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
  align,
  thClassName = "",
}) {
  return (
    <th
      className={`py-3 px-4 font-semibold ${align === "right" ? "text-right" : ""} ${thClassName}`}
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

export default function Inventory() {
  const [addOpen, setAddOpen] = useState(false);

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Debounce the search box (and reset to page 1).
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [query]);

  const fetchRawMaterials = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const res = await GetRawMaterials({
        search: debouncedQuery,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
        page,
        limit: PAGE_SIZE,
      });
      const { list, summary: s, total: t } = extractRawMaterials(res);
      setItems(list.map(normalizeRawMaterial));
      setSummary(s);
      setTotal(t);
    } catch {
      setItems([]);
      setListError("Couldn't load inventory.");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, sortBy, sortOrder, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRawMaterials();
  }, [fetchRawMaterials]);

  function toggleSort(field) {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  }

  const sortProps = { sortBy, sortOrder, onSort: toggleSort };

  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5 space-y-4 lg:space-y-5">
      <div className="max-w-[1400px] mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Inventory Raw Material
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Current raw material (Patta) stock on hand, grouped by size, point
              and grade. Stock is built from purchases.
            </p>
          </div>
          {/* <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1E4D96] hover:bg-[#1A3F7A] active:bg-[#15356A] text-white font-medium text-sm px-5 py-2.5 shadow-sm shadow-blue-200 transition-colors w-full sm:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1E4D96]/50"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Purchase
          </button> */}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard
            icon={Boxes}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Total Quantity (kg)"
            value={gmToKgDisplay(summary.totalQuantity || 0)}
          />
          <StatCard
            icon={PackageCheck}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="In Stock"
            value={String(summary.inStockCount ?? 0)}
          />
          <StatCard
            icon={PackageX}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
            label="Out of Stock"
            value={String(summary.outOfStockCount ?? 0)}
          />
        </div>

        {/* Stock panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Stock by Specification
            </h2>
            <div className="relative w-full sm:w-72">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search size, point, grade, name"
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
                onClick={fetchRawMaterials}
                className="mt-2 text-[#1E4D96] font-medium hover:underline"
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm">
                {debouncedQuery
                  ? "No stock matches your search."
                  : "No stock yet. Add raw material from the Purchase tab."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm table-fixed">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                      <SortHeader
                        label="Raw Material"
                        field="rawMaterialName"
                        {...sortProps}
                      />
                      <SortHeader label="Size" field="size" {...sortProps} />
                      <SortHeader label="Point" field="point" {...sortProps} />
                      <SortHeader label="Grade" field="grade" {...sortProps} />
                      <SortHeader
                        label="Total Qty"
                        field="totalQty"
                        {...sortProps}
                      />
                      <th className="py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Link
                            to={`/inventory/${g.id}`}
                            className="font-medium text-[#1E4D96] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40 rounded"
                            title={`View purchases for ${g.rawMaterialName}`}
                          >
                            {dash(g.rawMaterialName)}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {dash(g.size)}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {dash(g.point)}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {dash(g.grade)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {gmToKgDisplay(g.totalQty)} kg
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block whitespace-nowrap text-xs font-medium px-2 py-0.5 rounded-full ${
                              g.status === "in_stock"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {g.status === "in_stock"
                              ? "In stock"
                              : "Out of stock"}
                          </span>
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

      <AddPurchase
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={fetchRawMaterials}
      />
    </div>
  );
}
