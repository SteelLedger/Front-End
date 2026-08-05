import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import {
  Plus,
  Search,
  X,
  Settings,
  Printer,
  Share2,
  MoreVertical,
  FileSpreadsheet,
  BarChart3,
  Pencil,
  Trash2,
  Inbox,
  Check,
  Loader2,
  Boxes,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AddSaleDrawer from "../components/AddSaleDrawer";
import ConfirmDialog from "../components/ConfirmDialog";
import MenuPopover from "../components/MenuPopover";
import FilterSelect from "../components/FilterSelect";
import DateRangeFilter from "../components/DateRangeFilter";
import { isoToDMY } from "../utils/party";
import { gmToKgDisplay } from "../utils/units";
import {
  PERIOD_OPTIONS,
  PAYMENT_TYPES,
  rangeForPeriod,
  paymentTypeLabel,
  byProductLabel,
  emptySaleForm,
  buildSalePayload,
  normalizeSale,
  saleToForm,
  extractSales,
} from "../utils/sales";
import {
  GetSales,
  createSale,
  updateSale,
  DeleteSale,
  GetParties,
  GetProducts,
  GetByProducts,
} from "../services/apiServices";

const PAGE_SIZE = 10;

const PAYMENT_FILTER_OPTIONS = [
  { value: "all", label: "All Payments" },
  ...PAYMENT_TYPES,
];
// "Custom" isn't pickable — it's what the chip reads once dates are hand-set.
const PERIOD_PRESETS = PERIOD_OPTIONS.filter((o) => o.value !== "custom");

/* -------------------------------- pieces ---------------------------------- */

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
        className={
          active && dir === "desc" ? "text-[#1E4D96]" : "text-slate-300"
        }
      />
    </span>
  );
}

/** Header cell. Only fields the API can sort on get a sort button. */
function Th({ label, field, sortBy, sortOrder, onSort, align }) {
  const right = align === "right";
  return (
    <th className={`px-4 py-3 font-semibold ${right ? "text-right" : ""}`}>
      {field ? (
        // `uppercase` is repeated here because the preflight resets
        // text-transform on <button>, so it wouldn't inherit from the row.
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
      ) : (
        label
      )}
    </th>
  );
}

/**
 * Per-row ⋮ menu (Edit / Delete). The panel is portalled out of the table so
 * the horizontally scrolling wrapper can't clip it or scroll sideways to fit.
 */
function RowMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  const item =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`rounded-md p-1.5 transition-colors hover:bg-slate-100 hover:text-slate-600 ${
          open ? "bg-slate-100 text-slate-600" : "text-slate-400"
        }`}
      >
        <MoreVertical size={15} />
      </button>

      <MenuPopover
        open={open}
        anchorRef={btnRef}
        onClose={() => setOpen(false)}
        align="right"
        width={150}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onEdit();
          }}
          className={`${item} text-slate-700 hover:bg-blue-50`}
        >
          <Pencil size={14} /> Edit
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onDelete();
          }}
          className={`${item} text-rose-600 hover:bg-rose-50`}
        >
          <Trash2 size={14} /> Delete
        </button>
      </MenuPopover>
    </>
  );
}

/** "Sale Invoices ⌄" heading — the other views aren't built yet. */
function ViewSwitcher() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40"
      >
        <span className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Sale Invoices
        </span>
        <ChevronDown
          size={20}
          className={`mt-1 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <MenuPopover
        open={open}
        anchorRef={btnRef}
        onClose={() => setOpen(false)}
        width={196}
      >
        <span className="flex items-center justify-between rounded-lg bg-blue-50/60 px-3 py-2 text-sm font-semibold text-[#1E4D96]">
          Sale Invoices <Check size={14} />
        </span>
        {["Payment In", "Sale Order", "Sale Return"].map((v) => (
          <span
            key={v}
            className="flex items-center justify-between px-3 py-2 text-sm text-slate-400"
          >
            {v}
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold">
              Soon
            </span>
          </span>
        ))}
      </MenuPopover>
    </>
  );
}

function IconBtn({ icon: Icon, label, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 ${className}`}
    >
      <Icon size={17} />
    </button>
  );
}

// How many item lines show before the row collapses the rest behind "+N more".
const COLLAPSED_LINES = 3;

/**
 * A sale's products and byproducts as one ordered list for the Items cell.
 * Products first, then byproducts — each carrying the kind so the row can dot
 * them, and byproducts labelled with their source material.
 */
function saleLines(sale) {
  return [
    ...sale.products.map((p) => ({
      key: `p-${p.id || p.name}`,
      kind: "product",
      label: p.name || "—",
      quantity: p.quantity,
    })),
    ...sale.byProducts.map((b) => ({
      key: `b-${b.id || b.name}`,
      kind: "byproduct",
      label: byProductLabel(b.name, b.rawMaterialName) || "—",
      quantity: b.quantity,
    })),
  ];
}

/* --------------------------------- helpers -------------------------------- */

// Page through a list endpoint and accumulate everything (bounded).
async function fetchAll(fetchFn, key, params = {}) {
  const listOf = (res) => {
    const d = res?.data?.data ?? {};
    return Array.isArray(d) ? d : (d[key] ?? []);
  };
  const first = await fetchFn({ ...params, page: 1, limit: 100 });
  const all = [...listOf(first)];
  const pages = Math.min(first?.data?.meta?.pagination?.totalPages ?? 1, 20);
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        fetchFn({ ...params, page: i + 2, limit: 100 })
          .then(listOf)
          .catch(() => []),
      ),
    );
    rest.forEach((arr) => all.push(...arr));
  }
  return all;
}

function downloadCsv(rows, fromDMY, toDMY) {
  const head = [
    "Date",
    "Invoice no",
    "Party Name",
    "Item Type",
    "Item",
    "Size",
    "Payment Type",
    "Quantity (kg)",
  ];
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  // One row per item line — a sale with 3 items becomes 3 rows, which is what
  // you want in a spreadsheet. Invoices with no lines still get a row.
  const body = rows.flatMap((r) => {
    const lines = [
      ...r.products.map((p) => ["Product", p.name, p.size, p.quantity]),
      ...r.byProducts.map((b) => ["Byproduct", b.name, "", b.quantity]),
    ];
    const source = lines.length ? lines : [["", "", "", 0]];
    return source.map(([kind, name, size, qty]) =>
      [
        r.date,
        r.invoiceNumber,
        r.partyName,
        kind,
        name,
        size,
        paymentTypeLabel(r.paymentType),
        gmToKgDisplay(qty),
      ]
        .map(cell)
        .join(","),
    );
  });
  const csv = [head.map(cell).join(","), ...body].join("\r\n");
  // Leading BOM so Excel opens the UTF-8 text correctly.
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `sale-invoices-${fromDMY.replace(/\//g, "-")}-to-${toDMY.replace(/\//g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------------------------- page ---------------------------------- */

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [period, setPeriod] = useState("this_month");
  const [from, setFrom] = useState(() => rangeForPeriod("this_month").from);
  const [to, setTo] = useState(() => rangeForPeriod("this_month").to);
  const [paymentType, setPaymentType] = useState("all");

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptySaleForm);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Dropdown lookups.
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [byProducts, setByProducts] = useState([]);
  // Which invoice has its item breakdown open.
  const [expandedId, setExpandedId] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const fromDMY = isoToDMY(from);
  const toDMY = isoToDMY(to);
  const filtersDirty =
    period !== "this_month" || paymentType !== "all" || !!query.trim();

  // Debounce the search box (and reset to page 1).
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [query]);

  const listParams = useCallback(
    () => ({
      search: debouncedQuery || undefined,
      paymentType,
      fromDate: fromDMY || undefined,
      toDate: toDMY || undefined,
      sortBy,
      sortOrder,
    }),
    [debouncedQuery, paymentType, fromDMY, toDMY, sortBy, sortOrder],
  );

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const res = await GetSales({ ...listParams(), page, limit: PAGE_SIZE });
      const { list, summary: s, total: t } = extractSales(res);
      setSales(list.map(normalizeSale));
      setSummary(s);
      setTotal(t);
    } catch (err) {
      setSales([]);
      setListError("Couldn't load sales.");
      toast.error(err?.response?.data?.message || "Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, [listParams, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSales();
  }, [fetchSales]);

  // Party / product / byproduct pickers for the drawer.
  useEffect(() => {
    let alive = true;
    async function loadLookups() {
      const [partyRes, productRes, byProductRes] = await Promise.allSettled([
        fetchAll(GetParties, "parties"),
        fetchAll(GetProducts, "products"),
        fetchAll(GetByProducts, "byProducts"),
      ]);
      if (!alive) return;

      // A sale line needs `byProductInventoryId`. The documented
      // ByProductInventoryItem exposes only `slug`, so accept whichever id the
      // endpoint actually returns and drop rows that carry none — sending a
      // slug where an ObjectId is expected would just 400.
      if (byProductRes.status === "fulfilled") {
        const raw = byProductRes.value;
        const rows = raw.map((b) => ({
          id: b.byProductInventoryId ?? b._id ?? b.id ?? "",
          // Shown as "Khuniya (12X120K M8)" so the source material is visible
          // in the picker and on the chip once it's added.
          name: byProductLabel(b.byProductName, b.rawMaterialName),
          totalQtyGm: b.totalQty ?? 0,
        }));
        const sellable = rows.filter((b) => b.id && b.name);
        setByProducts(sellable);

        if (raw.length && !sellable.length) {
          // Say which half is missing, and dump a row so the gap is obvious.
          const missingId = !rows.some((b) => b.id);
          console.warn(
            "[sales] byproducts loaded but none are sellable.",
            `\nFields on the first row: ${Object.keys(raw[0]).join(", ")}`,
            `\nNeeded: an id (byProductInventoryId | _id | id)${missingId ? " — MISSING" : " — present"}`,
            `\nand byProductName${rows.some((b) => b.name) ? " — present" : " — MISSING"}`,
            "\nFirst row:",
            raw[0],
          );
          toast.error(
            missingId
              ? "Byproducts can't be sold yet — /by-products returns no id per row (see console)."
              : "Byproducts can't be sold — rows have no byProductName (see console).",
          );
        }
      } else {
        toast.error("Couldn't load byproducts");
      }

      if (partyRes.status === "fulfilled") {
        setParties(
          partyRes.value
            .map((p) => ({ id: p._id ?? p.id, name: p.name || "" }))
            .filter((p) => p.id && p.name),
        );
      } else {
        toast.error("Couldn't load parties");
      }

      if (productRes.status === "fulfilled") {
        setProducts(
          productRes.value
            .map((p) => ({
              id: p._id ?? p.id,
              name: p.productName || "",
              totalQtyGm: p.totalQty ?? 0,
            }))
            .filter((p) => p.id && p.name),
        );
      } else {
        toast.error("Couldn't load products");
      }
    }
    loadLookups();
    return () => {
      alive = false;
    };
  }, []);

  /* ------------------------------- handlers ------------------------------- */

  function changePeriod(value) {
    setPeriod(value);
    const range = rangeForPeriod(value);
    if (range) {
      setFrom(range.from);
      setTo(range.to);
    }
    setPage(1);
  }

  function changeDate(which, value) {
    if (which === "from") setFrom(value);
    else setTo(value);
    setPeriod("custom");
    setPage(1);
  }

  function clearDates() {
    setFrom("");
    setTo("");
    setPeriod("custom");
    setPage(1);
  }

  function resetFilters() {
    const range = rangeForPeriod("this_month");
    setPeriod("this_month");
    setFrom(range.from);
    setTo(range.to);
    setPaymentType("all");
    setQuery("");
    setSearchOpen(false);
    setSortBy("date");
    setSortOrder("desc");
    setPage(1);
  }

  function toggleSort(field) {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  }

  function openAdd() {
    setMode("add");
    setEditingId(null);
    setForm(emptySaleForm());
    setDrawerOpen(true);
  }

  function openEdit(sale) {
    setMode("edit");
    setEditingId(sale.id);
    setForm(saleToForm(sale));
    setDrawerOpen(true);
  }

  // `submitted` is the drawer's resolved form — it folds in any line still
  // sitting in the composer, which our own `form` state hasn't caught up to yet.
  async function handleSave(e, submitted) {
    e.preventDefault();
    const f = submitted ?? form;

    setSaving(true);
    try {
      const payload = buildSalePayload(f);
      if (mode === "add") {
        await createSale(payload);
        toast.success("Sale added");
        setPage(1);
      } else {
        await updateSale(editingId, payload);
        toast.success("Sale updated");
      }
      await fetchSales();
      setDrawerOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save sale");
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(sale) {
    setConfirmState({
      title: "Delete sale?",
      message: `Delete invoice "${sale.invoiceNumber}" for "${sale.partyName || "this party"}"? This can't be undone.`,
      confirmLabel: "Yes, delete",
      onConfirm: () => doDelete(sale),
    });
  }

  async function doDelete(sale) {
    try {
      await DeleteSale(sale.id);
      toast.success("Sale deleted");
      if (sales.length === 1 && page > 1) setPage((n) => n - 1);
      else await fetchSales();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't delete sale");
    }
  }

  // Export every sale matching the current filters, not just this page.
  async function handleExport() {
    setExporting(true);
    try {
      const all = await fetchAll(GetSales, "sales", listParams());
      if (!all.length) {
        toast.info("Nothing to export.");
        return;
      }
      downloadCsv(all.map(normalizeSale), fromDMY, toDMY);
      toast.success(`Exported ${all.length} sales`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't export sales");
    } finally {
      setExporting(false);
    }
  }

  const notBuilt = (what) => toast.info(`${what} isn't built yet.`);
  const sortProps = { sortBy, sortOrder, onSort: toggleSort };

  return (
    <div className="min-h-full space-y-4 bg-[#F7F8FB] p-4 lg:space-y-5 lg:p-5">
      <div className="mx-auto max-w-[1400px]">
        {/* Page header */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <ViewSwitcher />
            <p className="mt-1 text-sm text-slate-500">
              Every sale invoice you've raised, by party, product and quantity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1E4D96] px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-200 transition-colors hover:bg-[#1A3F7A] active:bg-[#15356A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50 focus-visible:ring-offset-1 sm:w-auto"
            >
              <Plus size={18} strokeWidth={2.5} />
              Add Sale
            </button>
            <IconBtn
              icon={Settings}
              label="Sale settings"
              onClick={() => notBuilt("Invoice settings")}
            />
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <span className="pl-1 pr-1 text-sm font-medium text-slate-400">
            Filter by
          </span>
          <FilterSelect
            label="Period"
            value={period}
            onChange={changePeriod}
            options={PERIOD_PRESETS}
            displayLabel={
              PERIOD_OPTIONS.find((o) => o.value === period)?.label
            }
            active={period !== "this_month"}
          />
          <DateRangeFilter
            from={from}
            to={to}
            onChange={changeDate}
            onClear={clearDates}
          />
          <FilterSelect
            label="Payment"
            value={paymentType}
            onChange={(v) => {
              setPaymentType(v);
              setPage(1);
            }}
            options={PAYMENT_FILTER_OPTIONS}
            active={paymentType !== "all"}
          />
          {filtersDirty && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} /> Reset
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="mb-5">
          <div className="flex w-full items-center gap-4 rounded-2xl border border-[#DCE6F5] bg-gradient-to-br from-[#F4F7FD] to-white p-4 shadow-sm sm:max-w-sm">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Boxes size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-slate-500">Total Quantity Sold</p>
              <p className="mt-0.5 text-2xl font-bold text-slate-900">
                {gmToKgDisplay(summary.totalQuantity || 0)}{" "}
                <span className="text-base font-semibold text-slate-500">
                  kg
                </span>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>
                  Invoices:{" "}
                  <span className="font-semibold text-slate-700">{total}</span>
                </span>
                <span className="hidden h-3 w-px bg-slate-300 sm:inline-block" />
                <span>
                  Products:{" "}
                  <span className="font-semibold text-slate-700">
                    {gmToKgDisplay(summary.totalProductQty || 0)} kg
                  </span>
                </span>
                <span className="hidden h-3 w-px bg-slate-300 sm:inline-block" />
                <span>
                  Byproducts:{" "}
                  <span className="font-semibold text-slate-700">
                    {gmToKgDisplay(summary.totalByProductQty || 0)} kg
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="flex flex-wrap items-baseline gap-x-3 text-base font-semibold text-slate-900">
              Transactions
              <span className="text-xs font-medium text-slate-400">
                {total} {total === 1 ? "entry" : "entries"}
              </span>
              {/* Explains the dots against each item line. */}
              {sales.length > 0 && (
                <span className="flex items-center gap-3 text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1E4D96]" />
                    Product
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    Byproduct
                  </span>
                </span>
              )}
            </h2>
            <div className="flex items-center gap-1">
              {searchOpen || query ? (
                <div className="relative w-56">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onBlur={() => !query && setSearchOpen(false)}
                    placeholder="Search invoice, party, product…"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm transition-colors focus:border-[#1E4D96] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E4D96]/30"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setSearchOpen(false);
                      }}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <IconBtn
                  icon={Search}
                  label="Search transactions"
                  onClick={() => setSearchOpen(true)}
                />
              )}
              <IconBtn
                icon={BarChart3}
                label="Sales graph"
                onClick={() => notBuilt("The sales graph")}
              />
              <IconBtn
                icon={exporting ? Loader2 : FileSpreadsheet}
                label="Export to Excel"
                className={`hover:text-emerald-600 ${exporting ? "animate-spin" : ""}`}
                onClick={exporting ? () => {} : handleExport}
              />
              <IconBtn
                icon={Printer}
                label="Print list"
                onClick={() => notBuilt("Printing")}
              />
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
                onClick={fetchSales}
                className="mt-2 font-medium text-[#1E4D96] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm">
                {debouncedQuery || paymentType !== "all"
                  ? "No sales match these filters."
                  : "No sales in this period yet. Add your first one."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1060px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Th label="Date" field="date" {...sortProps} />
                      <Th
                        label="Invoice no"
                        field="invoiceNumber"
                        {...sortProps}
                      />
                      <Th label="Party Name" />
                      <Th label="Items" />
                      <Th label="Transaction" />
                      <Th
                        label="Payment Type"
                        field="paymentType"
                        {...sortProps}
                      />
                      {/* Not sortable: a multi-item sale has no single quantity,
                          and the API dropped `quantity` from its sortBy enum. */}
                      <Th label="Quantity" align="right" />
                      <th className="w-32 px-4 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales.map((s) => {
                      const lines = saleLines(s);
                      const open = expandedId === s.id;
                      const shown = open ? lines : lines.slice(0, COLLAPSED_LINES);
                      const hidden = lines.length - shown.length;
                      return (
                      <tr key={s.id} className="align-top hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          {s.date || "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {s.invoiceNumber || "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#1E4D96]">
                          {s.partyName || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {lines.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <div className="min-w-[15rem] space-y-1">
                              {shown.map((l) => (
                                <div
                                  key={l.key}
                                  className="flex items-baseline justify-between gap-3"
                                >
                                  <span className="flex min-w-0 items-baseline gap-1.5">
                                    <span
                                      title={
                                        l.kind === "product"
                                          ? "Product"
                                          : "Byproduct"
                                      }
                                      className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                                        l.kind === "product"
                                          ? "bg-[#1E4D96]"
                                          : "bg-violet-500"
                                      }`}
                                    />
                                    <span
                                      className="truncate text-slate-700"
                                      title={l.label}
                                    >
                                      {l.label}
                                    </span>
                                  </span>
                                  <span className="shrink-0 whitespace-nowrap font-medium text-slate-600">
                                    {gmToKgDisplay(l.quantity)} kg
                                  </span>
                                </div>
                              ))}
                              {(hidden > 0 || open) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedId(open ? null : s.id)
                                  }
                                  aria-expanded={open}
                                  className="text-xs font-semibold text-[#1E4D96] hover:underline"
                                >
                                  {open ? "Show less" : `+${hidden} more`}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">Sale</td>
                        <td className="px-4 py-3 text-slate-600">
                          {paymentTypeLabel(s.paymentType)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-800">
                          {gmToKgDisplay(s.totalQuantity)} kg
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => notBuilt("Invoice printing")}
                              aria-label={`Print invoice ${s.invoiceNumber}`}
                              title="Print"
                              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#1E4D96]"
                            >
                              <Printer size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => notBuilt("Sharing")}
                              aria-label={`Share invoice ${s.invoiceNumber}`}
                              title="Share"
                              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#1E4D96]"
                            >
                              <Share2 size={15} />
                            </button>
                            <RowMenu
                              onEdit={() => openEdit(s)}
                              onDelete={() => requestDelete(s)}
                            />
                          </div>
                        </td>
                      </tr>
                      );
                    })}
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
                      onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
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

      <AddSaleDrawer
        open={drawerOpen}
        mode={mode}
        formState={form}
        setFormState={setForm}
        saving={saving}
        partyOptions={parties}
        productOptions={products}
        byProductOptions={byProducts}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSave}
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
