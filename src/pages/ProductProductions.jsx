import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  Scissors,
  ShoppingCart,
  SlidersHorizontal,
  Inbox,
  Loader2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileUp,
} from "lucide-react";
import AdjustmentDetailsModal, {
  AdjustmentDetailsButton,
} from "../components/AdjustmentDetailsModal";
import FilterSelect from "../components/FilterSelect";
import { GetProductInboundHistory } from "../services/apiServices";
import { gmToKgDisplay } from "../utils/units";

const PAGE_SIZE = 10;

/** { product, entries, summary } out of the response envelope. */
function extractHistory(res) {
  const body = res?.data ?? {};
  const d = body.data ?? {};
  const entries = Array.isArray(d.entries) ? d.entries : [];
  return {
    entries,
    product: d.product ?? null,
    summary: d.summary ?? {},
    total: Number(body.meta?.pagination?.total ?? entries.length) || 0,
  };
}

const dash = (v) => (v && String(v).trim() ? v : "—");

const num = (v) => Number(v) || 0;

const isAdjustment = (e) => e.entryType === "stock_adjustment";

/**
 * Adjustments and CSV imports carry `adjustmentDetails`. They're read through
 * the row's info icon only — never inline in the table.
 */
const detailsOf = (e) => String(e.adjustmentDetails ?? "").trim();

/** A manual adjustment that took stock OUT — the only outbound entry here. */
const isReduction = (e) =>
  isAdjustment(e) && e.adjustmentDirection === "reduce";

/**
 * Quantities are grams on the wire. A reduction is rendered with a minus sign
 * off the absolute value, so it reads correctly whether the API signs those
 * quantities or reports them as positive magnitudes.
 */
function entryQty(e) {
  const kg = gmToKgDisplay(Math.abs(num(e.quantity)));
  return isReduction(e) ? `−${kg} kg` : `${kg} kg`;
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, hint }) {
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
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
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

/**
 * How each `entryType` reads on screen. Both directions of a manual
 * adjustment share one "Stock adjusted" badge — the quantity's sign (and its
 * rose tint on a reduction) says which way it went, and the details dialog
 * names it in full.
 */
const ENTRY_TYPES = {
  purchase: {
    label: "Purchase",
    icon: ShoppingCart,
    className: "bg-blue-50 text-[#1E4D96]",
  },
  production: {
    label: "Production",
    icon: Scissors,
    className: "bg-violet-50 text-violet-700",
  },
  stock_adjustment: {
    label: "Stock adjusted",
    icon: SlidersHorizontal,
    className: "bg-amber-50 text-amber-700",
  },
  imported: {
    label: "Imported",
    icon: FileUp,
    className: "bg-teal-50 text-teal-700",
  },
};

/**
 * The Source filter — the API's `source` values. The two adjustment
 * directions share one entryType, so they're one option here.
 */
const SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "purchase", label: "Purchase" },
  { value: "production", label: "Production" },
  { value: "stock_adjustment", label: "Stock adjustment" },
  { value: "imported", label: "Imported" },
];

function entryTypeMeta(e) {
  return (
    ENTRY_TYPES[e.entryType] ?? {
      // An entryType the backend adds later still renders as something.
      label: dash(e.entryType),
      icon: SlidersHorizontal,
      className: "bg-slate-100 text-slate-600",
    }
  );
}

/** Where this stock came from — the highlight of each row. */
function EntryTypeBadge({ entry }) {
  const { label, icon: Icon, className } = entryTypeMeta(entry);
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon size={11} strokeWidth={2.5} />
      {label}
    </span>
  );
}

/**
 * The human handle for an entry: a circle purchase names its invoice and
 * supplier, a production names the sheet it was cut from. Adjustments and
 * imports get a plain label — their typed details live behind the info icon.
 */
function entryReference(e) {
  if (e.entryType === "production") {
    return e.rawMaterialName ? `Cut from ${e.rawMaterialName}` : "Production run";
  }
  if (isAdjustment(e)) return "Manual adjustment";
  if (e.entryType === "imported") return "CSV import";
  return [e.invoiceNumber, e.supplierName].filter(Boolean).join(" · ") || "—";
}

/** Product size / source material as small pills under the title. */
function SpecPill({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-700">{dash(value)}</span>
    </span>
  );
}

/**
 * ProductProductions
 * Everything that has come into one product's stock, reached by clicking its
 * name on the Product inventory page — the product-side twin of the
 * raw-material inbound history.
 *
 * Fed by GET /products/:id/inbound-history, which reads the durable
 * product_stock_movements collection. That is why this is no longer a list of
 * production runs: a product's stock can also arrive as a circle on a purchase
 * bill, or be corrected by hand. The endpoint returns the inventory row and a
 * summary alongside the entries, so nothing here has to page through
 * /products to find its own row.
 *
 * Product size and source material are the same for every row, so they sit in
 * the header rather than repeating down the table.
 */
export default function ProductProductions() {
  const { id } = useParams();

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  // The product inventory row, returned by the history endpoint itself.
  const [product, setProduct] = useState(null);

  // The adjustment whose details are open, if any.
  const [detailsEntry, setDetailsEntry] = useState(null);
  const closeDetails = useCallback(() => setDetailsEntry(null), []);

  // The history endpoint sorts by date only, and has no search.
  const [source, setSource] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const res = await GetProductInboundHistory(id, {
        source,
        sortOrder,
        page,
        limit: PAGE_SIZE,
      });
      const { entries, product: p, summary: s, total: t } = extractHistory(res);
      setRows(entries);
      setProduct(p);
      // The stat cards describe the whole product. Whether a filtered
      // response's summary is scoped to that source isn't pinned down, so
      // only an unfiltered one is allowed to update them — the page always
      // opens unfiltered, so they're filled before any filter can be picked.
      if (source === "all") setSummary(s);
      setTotal(t);
    } catch (err) {
      setRows([]);
      setListError(
        err?.response?.status === 404
          ? "This product no longer exists."
          : "Couldn't load inbound history for this product.",
      );
    } finally {
      setLoading(false);
    }
  }, [id, source, sortOrder, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, [fetchHistory]);

  function changeSource(v) {
    setSource(v);
    setPage(1);
  }

  // Date is the only sortable field the history endpoint offers.
  function toggleSort() {
    setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    setPage(1);
  }

  // Fall back to an entry while the row loads — each one names the same product.
  const spec = product ?? rows[0] ?? {};
  const title = spec.productName || "Product";
  const status =
    product?.status ??
    (num(product?.totalQty) > 0 ? "in_stock" : "out_of_stock");
  const inStock = product ? `${gmToKgDisplay(product.totalQty ?? 0)} kg` : "—";

  // "Stock adjusted" nets manual adds and reductions together with CSV-imported
  // opening stock, so the four cards add up to stock on hand. The breakdown
  // underneath names each part; imports only appear once there are some.
  const adjAdd = num(summary.totalAdjustmentAddQty);
  const adjReduce = Math.abs(num(summary.totalAdjustmentReduceQty));
  const imported = num(summary.totalImportedQty);
  const adjNet = adjAdd - adjReduce + imported;
  const noAdjustments = adjAdd === 0 && adjReduce === 0 && imported === 0;
  const adjValue = noAdjustments
    ? "0 kg"
    : `${adjNet < 0 ? "−" : "+"}${gmToKgDisplay(Math.abs(adjNet))} kg`;
  const adjHint = noAdjustments
    ? "No manual corrections or imports"
    : `+${gmToKgDisplay(adjAdd)} added · −${gmToKgDisplay(adjReduce)} reduced` +
      (imported > 0 ? ` · +${gmToKgDisplay(imported)} imported` : "");

  const totalBundles = num(summary.totalBundles);
  const filtered = source !== "all";
  const sourceLabel = SOURCE_OPTIONS.find((o) => o.value === source)?.label;

  const sortProps = { sortBy: "date", sortOrder, onSort: toggleSort };

  return (
    <div className="min-h-full space-y-4 bg-[#F7F8FB] p-4 lg:space-y-5 lg:p-5">
      <div className="mx-auto max-w-[1400px]">
        <Link
          to="/product-inventory"
          className="-ml-2 mb-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-[#1E4D96]"
        >
          <ArrowLeft size={15} />
          Back to Product
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Everything that has come into this product's stock — productions,
            circle purchases and manual corrections.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SpecPill label="Size" value={spec.productSize} />
            {/* Null on a product that only ever arrived as a purchased circle. */}
            {spec.rawMaterialName && (
              <SpecPill label="Cut from" value={spec.rawMaterialName} />
            )}
            {product && (
              <span
                className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                  status === "in_stock"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {status === "in_stock" ? "In stock" : "Out of stock"}
              </span>
            )}
          </div>
        </div>

        {/* Stats — one per way stock arrives, plus what's left. */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Boxes}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Stock on hand"
            value={inStock}
          />
          <StatCard
            icon={Scissors}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            label="From production"
            value={`${gmToKgDisplay(summary.totalProductionQty || 0)} kg`}
          />
          <StatCard
            icon={ShoppingCart}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="From purchases"
            value={`${gmToKgDisplay(summary.totalPurchaseQty || 0)} kg`}
            hint="Circles bought on a bill"
          />
          <StatCard
            icon={SlidersHorizontal}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            label="Stock adjusted"
            value={adjValue}
            hint={adjHint}
          />
        </div>

        {/* Entries */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="text-base font-semibold text-slate-900">
              Inbound History
              {total > 0 && (
                <span className="ml-2 text-xs font-medium text-slate-400">
                  {total} {total === 1 ? "entry" : "entries"}
                  {/* The bundle count is the whole product's, so it would
                      misread beside a filtered entry count. */}
                  {!filtered &&
                    totalBundles > 0 &&
                    ` · ${totalBundles} bundles`}
                </span>
              )}
            </h2>
            <FilterSelect
              label="Source"
              value={source}
              onChange={changeSource}
              options={SOURCE_OPTIONS}
              active={filtered}
              width={200}
              compact
            />
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
              {filtered ? (
                <>
                  <p className="text-sm">
                    No {sourceLabel.toLowerCase()} entries for this product.
                  </p>
                  <button
                    type="button"
                    onClick={() => changeSource("all")}
                    className="mt-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[#1E4D96] transition-colors hover:bg-blue-50"
                  >
                    Show all sources
                  </button>
                </>
              ) : (
                <p className="text-sm">Nothing has come into this product yet.</p>
              )}
            </div>
          ) : (
            <>
              {/* Phones and tablets get rows; the table needs 860px. */}
              <div className="divide-y divide-slate-100 xl:hidden">
                {rows.map((e) => (
                  <div key={e._id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <EntryTypeBadge entry={e} />
                        <span className="text-xs text-slate-400">
                          {dash(e.date)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-700">
                        {entryReference(e)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`font-semibold ${
                          isReduction(e) ? "text-rose-600" : "text-slate-900"
                        }`}
                      >
                        {entryQty(e)}
                      </p>
                      {e.bundles != null && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {e.bundles} bundles
                        </p>
                      )}
                    </div>
                    {detailsOf(e) && (
                      <div className="shrink-0">
                        <AdjustmentDetailsButton
                          onClick={() => setDetailsEntry(e)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[860px] text-sm">
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
                      <th className="w-24 px-4 py-3 text-center font-semibold">
                        Action
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
                          <EntryTypeBadge entry={e} />
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <span className="block max-w-[320px] truncate">
                            {entryReference(e)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-700">
                          {e.bundles ?? "—"}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                            isReduction(e) ? "text-rose-600" : "text-slate-900"
                          }`}
                        >
                          {entryQty(e)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {detailsOf(e) && (
                            <AdjustmentDetailsButton
                              onClick={() => setDetailsEntry(e)}
                            />
                          )}
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

      <AdjustmentDetailsModal
        open={!!detailsEntry}
        entry={detailsEntry}
        onClose={closeDetails}
      />
    </div>
  );
}
