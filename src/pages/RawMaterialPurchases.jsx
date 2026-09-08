import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
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
import { GetRawMaterialInboundHistory } from "../services/apiServices";
import { gmToKgDisplay } from "../utils/units";

const PAGE_SIZE = 10;

function extractHistory(res) {
  const body = res?.data ?? {};
  const d = body.data ?? {};
  const entries = Array.isArray(d.entries) ? d.entries : [];
  return {
    entries,
    rawMaterial: d.rawMaterial ?? null,
    summary: d.summary ?? {},
    total: Number(body.meta?.pagination?.total ?? entries.length) || 0,
  };
}

const dash = (v) => (v && String(v).trim() ? v : "—");

function StatCard({ icon: Icon, iconBg, iconColor, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

/** Where an inbound entry came from: a purchase bill or a production offcut. */
function EntryTypeBadge({ type }) {
  const isPurchase = type === "purchase";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        isPurchase
          ? "bg-blue-50 text-[#1E4D96]"
          : "bg-violet-50 text-violet-700"
      }`}
    >
      {isPurchase ? "Purchase" : "Balance patta"}
    </span>
  );
}

/**
 * The human handle for an entry: a purchase names its invoice and supplier,
 * a balance patta names the run it was cut from.
 */
function entryReference(e) {
  if (e.entryType === "balance_patta") {
    return e.sourceRawMaterialName
      ? `Cut from ${e.sourceRawMaterialName}`
      : "From production";
  }
  return [e.invoiceNumber, e.supplierName].filter(Boolean).join(" · ") || "—";
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

  // The endpoint returns the inventory row alongside its history, so the header
  // no longer has to hunt for it through the paginated /raw-materials list.
  const [material, setMaterial] = useState(null);

  // The history endpoint sorts by date only, and has no search.
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const res = await GetRawMaterialInboundHistory(id, {
        sortOrder,
        page,
        limit: PAGE_SIZE,
      });
      const {
        entries,
        rawMaterial,
        summary: s,
        total: t,
      } = extractHistory(res);
      setRows(entries);
      setMaterial(rawMaterial);
      setSummary(s);
      setTotal(t);
    } catch {
      setRows([]);
      setListError("Couldn't load inbound history for this raw material.");
    } finally {
      setLoading(false);
    }
  }, [id, sortOrder, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, [fetchHistory]);

  // Date is the only sortable field the history endpoint offers.
  function toggleSort() {
    setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    setPage(1);
  }

  // Fall back to an entry while the row loads — each one carries the same spec.
  const spec = material ?? rows[0] ?? {};
  const title = spec.rawMaterialName || "Raw material";
  const inStock = material
    ? `${gmToKgDisplay(material.totalQty ?? 0)} kg`
    : "—";

  const sortProps = { sortBy: "date", sortOrder, onSort: toggleSort };

  return (
    <div className="min-h-full space-y-4 bg-[#F7F8FB] p-4 lg:space-y-5 lg:p-5">
      <div className="mx-auto max-w-[1400px]">
        <Link
          to="/inventory"
          className="-ml-2 mb-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-[#1E4D96]"
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
            icon={ShoppingCart}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="From purchases"
            value={`${gmToKgDisplay(summary.totalPurchaseQty || 0)} kg`}
          />
          <StatCard
            icon={Layers}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            label="From balance patta"
            value={`${gmToKgDisplay(summary.totalBalancePattaQty || 0)} kg`}
          />
        </div>

        {/* Purchases */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="text-base font-semibold text-slate-900">
              Inbound History
              {total > 0 && (
                <span className="ml-2 text-xs font-medium text-slate-400">
                  {total} {total === 1 ? "entry" : "entries"}
                </span>
              )}
            </h2>
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
                onClick={fetchHistory}
                className="mt-2 font-medium text-[#1E4D96] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm">
                Nothing has come into this raw material yet.
              </p>
            </div>
          ) : (
            <>
              {/* Phones and tablets get rows; the table needs 740px. */}
              <div className="divide-y divide-slate-100 xl:hidden">
                {rows.map((e) => (
                  <div key={e._id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <EntryTypeBadge type={e.entryType} />
                        <span className="text-xs text-slate-400">
                          {dash(e.date)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-700">
                        {entryReference(e)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-slate-900">
                        {gmToKgDisplay(e.quantity ?? 0)} kg
                      </p>
                      {e.bundles != null && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {e.bundles} bundles
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[740px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <SortHeader label="Date" field="date" {...sortProps} />
                      <th className="px-4 py-3 font-semibold">Source</th>
                      <th className="px-4 py-3 font-semibold">Reference</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Bundles
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Quantity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((e) => (
                      <tr key={e._id} className="hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          {dash(e.date)}
                        </td>
                        <td className="px-4 py-3">
                          <EntryTypeBadge type={e.entryType} />
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {entryReference(e)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-700">
                          {e.bundles ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                          {gmToKgDisplay(e.quantity ?? 0)} kg
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
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
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
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
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
