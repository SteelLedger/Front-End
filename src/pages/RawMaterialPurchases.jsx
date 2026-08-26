import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  X,
  Boxes,
  ShoppingCart,
  Layers,
  Inbox,
  Loader2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { GetPurchases, GetRawMaterials } from "../services/apiServices";
import { gmToKgDisplay } from "../utils/units";

const PAGE_SIZE = 10;

function extractPurchases(res) {
  const body = res?.data ?? {};
  const d = body.data ?? {};
  const list = Array.isArray(d) ? d : (d.purchases ?? d.results ?? []);
  const summary = (Array.isArray(d) ? {} : d.summary) ?? {};
  return {
    list: Array.isArray(list) ? list : [],
    summary,
    total: Number(body.meta?.pagination?.total ?? list.length) || 0,
  };
}

const dash = (v) => (v && String(v).trim() ? v : "—");

/**
 * A bill's total for one line-item field. Bills carry `lineItems[]`, and this
 * view is already filtered to a single raw material, so the lines that come
 * back all belong to it. Falls back to the bill-level total the API sends.
 */
function billTotal(bill, field) {
  const key = field === "bundles" ? "totalBundles" : "totalQuantity";
  if (bill?.[key] != null) return Number(bill[key]) || 0;
  return (bill?.lineItems ?? []).reduce(
    (sum, l) => sum + (Number(l?.[field]) || 0),
    0,
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-lg font-semibold text-slate-900">{value}</p>
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
      className={`px-4 py-3 font-semibold ${align === "right" ? "text-right" : ""}`}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-slate-700 ${
          align === "right" ? "flex-row-reverse" : ""
        } ${sortBy === field ? "text-[#1E4D96]" : ""}`}
      >
        {label}
        <SortIcon active={sortBy === field} dir={sortOrder} />
      </button>
    </th>
  );
}

/** Size / point / grade as small pills under the title. */
function SpecPill({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-700">{dash(value)}</span>
    </span>
  );
}

/**
 * RawMaterialPurchases
 * Every purchase that built up one raw-material inventory row, reached by
 * clicking its name on the Raw Material page.
 *
 * Size / point / grade are identical for every row here, so they sit in the
 * header rather than repeating down the table.
 */
export default function RawMaterialPurchases() {
  const { id } = useParams();

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  // The raw-material row itself, for the header and stock-on-hand.
  const [material, setMaterial] = useState(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const res = await GetPurchases({
        rawMaterialId: id,
        search: debouncedQuery,
        sortBy,
        sortOrder,
        page,
        limit: PAGE_SIZE,
      });
      const { list, summary: s, total: t } = extractPurchases(res);
      setRows(list);
      setSummary(s);
      setTotal(t);
    } catch {
      setRows([]);
      setListError("Couldn't load purchases for this raw material.");
    } finally {
      setLoading(false);
    }
  }, [id, debouncedQuery, sortBy, sortOrder, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPurchases();
  }, [fetchPurchases]);

  // There's no GET /raw-materials/:id, so page the list and pick this row out.
  // Doing it here (rather than passing state through the link) keeps the page
  // identical on a refresh or a shared URL.
  useEffect(() => {
    let alive = true;
    async function loadMaterial() {
      const rmOf = (res) => {
        const d = res?.data?.data ?? {};
        return Array.isArray(d) ? d : (d.rawMaterials ?? []);
      };
      try {
        const first = await GetRawMaterials({ page: 1, limit: 100 });
        let all = rmOf(first);
        const pages = Math.min(
          first?.data?.meta?.pagination?.totalPages ?? 1,
          10,
        );
        for (let p = 2; p <= pages && !all.some((m) => m._id === id); p++) {
          const next = await GetRawMaterials({ page: p, limit: 100 });
          all = all.concat(rmOf(next));
        }
        if (alive) setMaterial(all.find((m) => (m._id ?? m.id) === id) ?? null);
      } catch {
        if (alive) setMaterial(null); // header falls back to purchase rows
      }
    }
    loadMaterial();
    return () => {
      alive = false;
    };
  }, [id]);

  function toggleSort(field) {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  }

  // Fall back to the purchase rows when the inventory row hasn't arrived —
  // every purchase carries the same spec.
  const spec = material ?? rows[0] ?? {};
  const title = spec.rawMaterialName || "Raw material";
  const inStock = material
    ? `${gmToKgDisplay(material.totalQty ?? 0)} kg`
    : "—";

  const sortProps = { sortBy, sortOrder, onSort: toggleSort };

  return (
    <div className="min-h-full space-y-4 bg-[#F7F8FB] p-4 lg:space-y-5 lg:p-5">
      <div className="mx-auto max-w-[1400px]">
        <Link
          to="/inventory"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-[#1E4D96]"
        >
          <ArrowLeft size={15} />
          Back to Raw Material
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Every purchase that built up this raw material's stock.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SpecPill label="Size" value={spec.size} />
            <SpecPill label="Point" value={spec.point} />
            <SpecPill label="Grade" value={spec.grade} />
            {material && (
              <span
                className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                  (material.status ??
                    (Number(material.totalQty) > 0
                      ? "in_stock"
                      : "out_of_stock")) === "in_stock"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {(material.status ??
                  (Number(material.totalQty) > 0
                    ? "in_stock"
                    : "out_of_stock")) === "in_stock"
                  ? "In stock"
                  : "Out of stock"}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={Boxes}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Stock on hand"
            value={inStock}
          />
          <StatCard
            icon={Layers}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="Total purchased"
            value={`${gmToKgDisplay(summary.totalQuantity || 0)} kg`}
          />
          <StatCard
            icon={ShoppingCart}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            label="Purchase bills"
            value={String(total)}
          />
        </div>

        {/* Purchases */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="text-base font-semibold text-slate-900">
              Purchase History
              {total > 0 && (
                <span className="ml-2 text-xs font-medium text-slate-400">
                  {total} {total === 1 ? "bill" : "bills"}
                </span>
              )}
            </h2>
            <div className="relative w-full sm:w-72">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search supplier or invoice"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-sm transition-colors focus:border-[#1E4D96] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E4D96]/30"
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
            <div className="flex flex-col items-center justify-center py-16 text-center text-rose-500">
              <p className="text-sm">{listError}</p>
              <button
                type="button"
                onClick={fetchPurchases}
                className="mt-2 font-medium text-[#1E4D96] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm">
                {debouncedQuery
                  ? "No purchases match your search."
                  : "No purchases recorded for this raw material."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[740px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <SortHeader label="Date" field="date" {...sortProps} />
                      <SortHeader
                        label="Invoice no"
                        field="invoiceNumber"
                        {...sortProps}
                      />
                      <th className="px-4 py-3 font-semibold">Supplier</th>
                      <SortHeader
                        label="Bundles"
                        field="totalBundles"
                        align="right"
                        {...sortProps}
                      />
                      <SortHeader
                        label="Quantity"
                        field="totalQuantity"
                        align="right"
                        {...sortProps}
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((p) => (
                      <tr key={p._id ?? p.id} className="hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          {dash(p.date)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {dash(p.invoiceNumber)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {dash(p.supplierName)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-700">
                          {billTotal(p, "bundles")}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                          {gmToKgDisplay(billTotal(p, "quantity"))} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((n) => Math.max(1, n - 1))}
                      aria-label="Previous page"
                      className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((n) => Math.min(totalPages, n + 1))
                      }
                      aria-label="Next page"
                      className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
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
    </div>
  );
}
