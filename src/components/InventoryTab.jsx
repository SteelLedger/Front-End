import { useState, useEffect, useCallback } from "react";
import {
  Search,
  X,
  Inbox,
  Loader2,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 10;

const STATUS_CHIPS = [
  { value: "all", label: "All" },
  { value: "in_stock", label: "In stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

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

/**
 * InventoryTab
 * Server-driven inventory list: stats + search + status filter + sortable
 * columns + pagination. Config comes from props (kept module-stable by callers).
 */
export default function InventoryTab({
  fetchFn,
  extract,
  normalize,
  columns,
  statCards,
  searchPlaceholder = "Search…",
  reloadKey,
  onView,
}) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
      const res = await fetchFn({
        search: debounced,
        status,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
        page,
        limit: PAGE_SIZE,
      });
      const { list, summary: s, total: t } = extract(res);
      setRows(list.map(normalize));
      setSummary(s);
      setTotal(t);
    } catch {
      setRows([]);
      setError("Couldn't load inventory.");
    } finally {
      setLoading(false);
    }
  }, [debounced, status, sortBy, sortOrder, page, fetchFn, extract, normalize]);

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

  const cards = statCards(summary, total);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_CHIPS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setStatus(c.value);
                  setPage(1);
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  status === c.value
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
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
              {debounced || status !== "all"
                ? "No items match your filters."
                : "Nothing here yet."}
            </p>
          </div>
        ) : (
          <>
            {/* Phones get cards: first column is the heading, the rest
                become label/value pairs. */}
            <div className="divide-y divide-slate-100 xl:hidden">
              {rows.map((row, ri) => (
                <div key={row.id ?? ri} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 font-semibold text-slate-800">
                      {columns[0].render(row)}
                    </div>
                    {onView && (
                      <button
                        type="button"
                        onClick={() => onView(row)}
                        aria-label="View byproducts"
                        className="shrink-0 rounded-md p-2.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#1E4D96]"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                  </div>
                  {columns.length > 1 && (
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      {columns.slice(1).map((col) => (
                        <div key={col.label} className="min-w-0">
                          <dt className="text-slate-400">{col.label}</dt>
                          <dd className="mt-0.5 truncate text-slate-700">
                            {col.render(row)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[640px] text-sm table-fixed">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                    {columns.map((col) => (
                      // The table is `table-fixed`, so these widths come from
                      // the header row. Without them a short column set just
                      // stretches to equal thirds and reads sparse.
                      <th
                        key={col.label}
                        className={`py-3 px-4 font-semibold ${col.width ?? ""}`}
                      >
                        {col.sortField ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(col.sortField)}
                            className="inline-flex items-center gap-1 hover:text-slate-700"
                          >
                            {col.label}
                            <SortIcon
                              active={sortBy === col.sortField}
                              dir={sortOrder}
                            />
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                    {onView && (
                      <th className="py-3 px-4 font-semibold text-right w-24">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, ri) => (
                    <tr key={row.id ?? ri} className="hover:bg-slate-50/70">
                      {columns.map((col) => (
                        <td
                          key={col.label}
                          className="py-3 px-4 text-slate-600"
                        >
                          {col.render(row)}
                        </td>
                      ))}
                      {onView && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => onView(row)}
                              aria-label="View byproducts"
                              title="View byproducts"
                              className="p-1.5 rounded-md text-slate-400 hover:text-[#1E4D96] hover:bg-blue-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      )}
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
  );
}
