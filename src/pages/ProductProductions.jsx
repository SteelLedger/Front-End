import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  Scissors,
  Package,
  Inbox,
  Loader2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { GetProductions, GetProducts } from "../services/apiServices";
import { gmToKgDisplay } from "../utils/units";

const PAGE_SIZE = 10;

function extractProductions(res) {
  const body = res?.data ?? {};
  const d = body.data ?? {};
  const list = Array.isArray(d) ? d : (d.productions ?? []);
  return {
    list: Array.isArray(list) ? list : [],
    summary: (Array.isArray(d) ? {} : d.summary) ?? {},
    total: Number(body.meta?.pagination?.total ?? list.length) || 0,
  };
}

const dash = (v) => (v && String(v).trim() ? v : "—");

/** ISO or DD/MM/YYYY in, DD/MM/YYYY out. */
function fmtDate(value) {
  if (!value) return "—";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

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
  const right = align === "right";
  return (
    <th className={`px-4 py-3 font-semibold ${right ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-slate-700 ${
          right ? "flex-row-reverse" : ""
        } ${sortBy === field ? "text-[#1E4D96]" : ""}`}
      >
        {label}
        <SortIcon active={sortBy === field} dir={sortOrder} />
      </button>
    </th>
  );
}

/** Product size / raw material as small pills under the title. */
function SpecPill({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-700">{dash(value)}</span>
    </span>
  );
}

/** The byproducts a run threw off, as a compact inline list. */
function ByproductList({ items = [] }) {
  if (!items.length) return <span className="text-slate-300">—</span>;
  return (
    <span className="text-xs text-slate-500">
      {items
        .map((b) => `${b.byProductName} ${gmToKgDisplay(b.qty || 0)} kg`)
        .join(", ")}
    </span>
  );
}

/**
 * ProductProductions
 * Every production run that made one product, reached by clicking its name on
 * the Product inventory page — the counterpart to the raw-material inbound
 * history. Product size and source material are identical for every row here,
 * so they sit in the header rather than repeating down the table.
 */
export default function ProductProductions() {
  const { id } = useParams();

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  // The product inventory row, for the header and stock-on-hand.
  const [product, setProduct] = useState(null);

  const [sortBy, setSortBy] = useState("productionDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchProductions = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const res = await GetProductions({
        productId: id,
        sortBy,
        sortOrder,
        page,
        limit: PAGE_SIZE,
      });
      const { list, summary: s, total: t } = extractProductions(res);
      setRows(list);
      setSummary(s);
      setTotal(t);
    } catch {
      setRows([]);
      setListError("Couldn't load production history for this product.");
    } finally {
      setLoading(false);
    }
  }, [id, sortBy, sortOrder, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProductions();
  }, [fetchProductions]);

  // There's no GET /products/:id, so page the list and pick this row out — it
  // carries the stock-on-hand figure the production rows don't have.
  useEffect(() => {
    let alive = true;
    async function loadProduct() {
      const rowsOf = (res) => {
        const d = res?.data?.data ?? {};
        return Array.isArray(d) ? d : (d.products ?? []);
      };
      try {
        const first = await GetProducts({ page: 1, limit: 100 });
        let all = rowsOf(first);
        const pages = Math.min(
          first?.data?.meta?.pagination?.totalPages ?? 1,
          10,
        );
        for (let p = 2; p <= pages && !all.some((m) => m._id === id); p++) {
          const next = await GetProducts({ page: p, limit: 100 });
          all = all.concat(rowsOf(next));
        }
        if (alive) setProduct(all.find((m) => (m._id ?? m.id) === id) ?? null);
      } catch {
        if (alive) setProduct(null); // header falls back to the run rows
      }
    }
    loadProduct();
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

  // Fall back to a run while the inventory row loads — every run here made the
  // same product.
  const spec = product ?? rows[0] ?? {};
  const title = spec.productName || "Product";
  const status =
    product?.status ??
    (Number(product?.totalQty) > 0 ? "in_stock" : "out_of_stock");
  const inStock = product ? `${gmToKgDisplay(product.totalQty ?? 0)} kg` : "—";

  const sortProps = { sortBy, sortOrder, onSort: toggleSort };

  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5">
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
            Every production run that made this product.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SpecPill label="Size" value={spec.productSize} />
            <SpecPill label="Cut from" value={spec.rawMaterialName} />
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
            icon={Scissors}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="Total produced"
            value={`${gmToKgDisplay(summary.totalQuantity || 0)} kg`}
          />
          <StatCard
            icon={Package}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            label="Production runs"
            value={String(total)}
          />
        </div>

        {/* Runs */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="text-base font-semibold text-slate-900">
              Production History
              {total > 0 && (
                <span className="ml-2 text-xs font-medium text-slate-400">
                  {total} {total === 1 ? "run" : "runs"}
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
                onClick={fetchProductions}
                className="mt-2 font-medium text-[#1E4D96] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm">
                No production runs recorded for this product.
              </p>
            </div>
          ) : (
            <>
              {/* Phones and tablets get rows; the table needs the width. */}
              <div className="divide-y divide-slate-100 xl:hidden">
                {rows.map((r) => (
                  <div key={r._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">
                          {gmToKgDisplay(r.productQty || 0)} kg produced
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {fmtDate(r.productionDate)} · from{" "}
                          {dash(r.rawMaterialName)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-slate-500">
                        <p>{r.productBundles || 0} bundles</p>
                        <p className="mt-0.5">
                          Waste {gmToKgDisplay(r.wasteQty || 0)} kg
                        </p>
                      </div>
                    </div>
                    {r.byProducts?.length > 0 && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                        <ByproductList items={r.byProducts} />
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <SortHeader
                        label="Date"
                        field="productionDate"
                        {...sortProps}
                      />
                      <th className="px-4 py-3 font-semibold">Cut from</th>
                      <th className="px-4 py-3 font-semibold">Byproducts</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Bundles
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Waste
                      </th>
                      <SortHeader
                        label="Produced"
                        field="productQty"
                        align="right"
                        {...sortProps}
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          {fmtDate(r.productionDate)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {dash(r.rawMaterialName)}
                        </td>
                        <td className="px-4 py-3">
                          <ByproductList items={r.byProducts} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                          {r.productBundles || 0}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-slate-600">
                          {gmToKgDisplay(r.wasteQty || 0)} kg
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                          {gmToKgDisplay(r.productQty || 0)} kg
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
