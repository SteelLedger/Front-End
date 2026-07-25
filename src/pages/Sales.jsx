import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import {
  Plus,
  Search,
  X,
  Settings,
  Calendar,
  Filter,
  Printer,
  Share2,
  MoreVertical,
  FileSpreadsheet,
  BarChart3,
  Pencil,
  Trash2,
  Inbox,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AddSaleDrawer from "../components/AddSaleDrawer";
import ConfirmDialog from "../components/ConfirmDialog";
import { isoToDMY } from "../utils/party";
import { BYPRODUCT_OPTIONS } from "../utils/byproducts";
import {
  PERIOD_OPTIONS,
  FIRM_OPTIONS,
  USER_OPTIONS,
  FALLBACK_PARTIES,
  FALLBACK_PRODUCTS,
  rangeForPeriod,
  formatINR,
  saleBalance,
  emptySaleForm,
  saleFromForm,
  saleToForm,
  seedSales,
} from "../utils/sales";
import { GetParties, GetProducts, GetByProducts } from "../services/apiServices";

const PAGE_SIZE = 10;
const PILL =
  "inline-flex items-center gap-1.5 rounded-full bg-[#EEF3FB] px-3.5 py-2 " +
  "text-sm font-medium text-[#1E4D96]";

/* -------------------------------- pieces ---------------------------------- */

/** Rounded chip wrapping a native select (period / firm / user filters). */
function PillSelect({ value, onChange, options, ariaLabel }) {
  return (
    <span className={`${PILL} relative pr-8`}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent pr-1 font-medium text-[#1E4D96] focus:outline-none"
      >
        {options.map((o) => {
          const val = typeof o === "string" ? o : o.value;
          const label = typeof o === "string" ? o : o.label;
          return (
            <option key={val} value={val} className="text-slate-700">
              {label}
            </option>
          );
        })}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#1E4D96]"
      />
    </span>
  );
}

/** Funnel popover with a checkbox list of the column's distinct values. */
function ColumnFilter({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const toggle = (value) =>
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );

  return (
    <span ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Filter by ${label}`}
        title={`Filter by ${label}`}
        className={`rounded p-0.5 transition-colors ${
          selected.length
            ? "text-[#1E4D96]"
            : "text-slate-300 hover:text-slate-500"
        }`}
      >
        <Filter size={13} fill={selected.length ? "currentColor" : "none"} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <div className="max-h-56 overflow-y-auto">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">
                Nothing to filter
              </p>
            ) : (
              options.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggle(o)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm normal-case tracking-normal text-slate-700 transition-colors hover:bg-blue-50"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      selected.includes(o)
                        ? "border-[#1E4D96] bg-[#1E4D96] text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {selected.includes(o) && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="truncate font-normal">{o}</span>
                </button>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full border-t border-slate-100 px-3 py-1.5 text-left text-xs font-semibold normal-case tracking-normal text-[#1E4D96] hover:bg-blue-50"
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </span>
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
        className={
          active && dir === "desc" ? "text-[#1E4D96]" : "text-slate-300"
        }
      />
    </span>
  );
}

function Th({ label, field, sortBy, sortOrder, onSort, align, children }) {
  return (
    <th
      className={`px-4 py-3 font-semibold ${align === "right" ? "text-right" : ""}`}
    >
      <span
        className={`inline-flex items-center gap-1.5 ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        {field ? (
          <button
            type="button"
            onClick={() => onSort(field)}
            className="inline-flex items-center gap-1 hover:text-slate-700"
          >
            {label}
            <SortIcon active={sortBy === field} dir={sortOrder} />
          </button>
        ) : (
          label
        )}
        {children}
      </span>
    </th>
  );
}

/** Per-row ⋮ menu (Edit / Delete). */
function RowMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <span ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"
          >
            <Pencil size={14} /> Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </span>
  );
}

/** "Sale Invoices ⌄" heading — the other views aren't built yet. */
function ViewSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <span className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-[#1E4D96]">
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
        </div>
      )}
    </span>
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

/* --------------------------------- helpers -------------------------------- */

const distinct = (rows, key) =>
  [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort();

function downloadCsv(rows, from, to) {
  const head = [
    "Date",
    "Invoice no",
    "Party Name",
    "Product",
    "By Product",
    "Transaction",
    "Payment Type",
    "Amount",
    "Received",
    "Balance",
  ];
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((r) =>
    [
      isoToDMY(r.date),
      r.invoiceNumber,
      r.partyName,
      r.productName,
      r.byProductName,
      r.transaction,
      r.paymentType,
      r.amount,
      r.received,
      saleBalance(r),
    ]
      .map(cell)
      .join(","),
  );
  const csv = [head.map(cell).join(","), ...body].join("\r\n");
  // Leading BOM so Excel opens the ₹ / UTF-8 text correctly.
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `sale-invoices-${from}-to-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------------------------- page ---------------------------------- */

export default function Sales() {
  // Sales aren't on the API yet — the list lives in local state off the seed rows.
  const [sales, setSales] = useState(seedSales);

  const [period, setPeriod] = useState("this_month");
  const [from, setFrom] = useState(() => rangeForPeriod("this_month").from);
  const [to, setTo] = useState(() => rangeForPeriod("this_month").to);
  const [firm, setFirm] = useState(FIRM_OPTIONS[0]);
  const [user, setUser] = useState(USER_OPTIONS[0]);

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [colFilters, setColFilters] = useState({
    partyName: [],
    transaction: [],
    paymentType: [],
  });
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptySaleForm);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  // Dropdown lookups. Parties / products / byproducts already have endpoints,
  // so use them — with static fallbacks so the form still works offline.
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [byProducts, setByProducts] = useState([]);

  useEffect(() => {
    let alive = true;
    const listOf = (res, key) => {
      const d = res?.data?.data ?? res?.data ?? [];
      return Array.isArray(d) ? d : (d[key] ?? []);
    };

    async function loadLookups() {
      const [partyRes, productRes, byProductRes] = await Promise.allSettled([
        GetParties({ page: 1, limit: 100 }),
        GetProducts({ page: 1, limit: 100 }),
        GetByProducts({ page: 1, limit: 100 }),
      ]);
      if (!alive) return;

      const partyList =
        partyRes.status === "fulfilled"
          ? listOf(partyRes.value, "parties")
              .map((p) => ({ id: p._id ?? p.id ?? "", name: p.name || "" }))
              .filter((p) => p.name)
          : [];
      setParties(
        partyList.length
          ? partyList
          : FALLBACK_PARTIES.map((name) => ({ id: "", name })),
      );

      const productList =
        productRes.status === "fulfilled"
          ? [
              ...new Set(
                listOf(productRes.value, "products")
                  .map((p) => p.productName)
                  .filter(Boolean),
              ),
            ]
          : [];
      setProducts(productList.length ? productList : FALLBACK_PRODUCTS);

      const byProductList =
        byProductRes.status === "fulfilled"
          ? [
              ...new Set(
                listOf(byProductRes.value, "byProducts")
                  .map((b) => b.byProductName)
                  .filter(Boolean),
              ),
            ]
          : [];
      setByProducts(byProductList.length ? byProductList : BYPRODUCT_OPTIONS);
    }

    loadLookups();
    return () => {
      alive = false;
    };
  }, []);

  /* ------------------------------ filtering ------------------------------- */

  const dateFiltered = useMemo(
    () => sales.filter((s) => (!from || s.date >= from) && (!to || s.date <= to)),
    [sales, from, to],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = dateFiltered.filter((s) => {
      if (
        q &&
        ![
          s.invoiceNumber,
          s.partyName,
          s.productName,
          s.byProductName,
          s.paymentType,
          s.transaction,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return Object.entries(colFilters).every(
        ([key, picked]) => picked.length === 0 || picked.includes(s[key]),
      );
    });

    const dir = sortOrder === "asc" ? 1 : -1;
    return [...matches].sort((a, b) => {
      const av = sortBy === "balance" ? saleBalance(a) : a[sortBy];
      const bv = sortBy === "balance" ? saleBalance(b) : b[sortBy];
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
        numeric: true,
      }) * dir;
    });
  }, [dateFiltered, query, colFilters, sortBy, sortOrder]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, s) => {
          acc.amount += Number(s.amount) || 0;
          acc.received += Number(s.received) || 0;
          return acc;
        },
        { amount: 0, received: 0 },
      ),
    [rows],
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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

  function setColFilter(key, values) {
    setColFilters((f) => ({ ...f, [key]: values }));
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

  // No create/update endpoint yet — write straight to local state so the flow
  // is demoable end to end. Swap for createSale/updateSale when they exist.
  function handleSave() {
    setSaving(true);
    if (mode === "add") {
      const sale = saleFromForm(form, `local-${Date.now()}`);
      setSales((prev) => [sale, ...prev]);
      // Make sure the new row is visible even if it falls outside the range.
      if (sale.date < from) setFrom(sale.date);
      if (sale.date > to) setTo(sale.date);
      toast.success("Sale added");
      setPage(1);
    } else {
      setSales((prev) =>
        prev.map((s) => (s.id === editingId ? saleFromForm(form, s.id) : s)),
      );
      toast.success("Sale updated");
    }
    setSaving(false);
    setDrawerOpen(false);
  }

  function requestDelete(sale) {
    setConfirmState({
      title: "Delete sale?",
      message: `Delete invoice "${sale.invoiceNumber}" for "${sale.partyName}"? This can't be undone.`,
      confirmLabel: "Yes, delete",
      onConfirm: () => {
        setSales((prev) => prev.filter((s) => s.id !== sale.id));
        toast.success("Sale deleted");
      },
    });
  }

  const notReady = (what) =>
    toast.info(`${what} will be available once the sales API is ready.`);

  const sortProps = { sortBy, sortOrder, onSort: toggleSort };

  return (
    <div className="min-h-full space-y-4 bg-[#F7F8FB] p-4 lg:space-y-5 lg:p-5">
      <div className="mx-auto max-w-[1400px]">
        {/* Page header */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <ViewSwitcher />
            <p className="mt-1 text-sm text-slate-500">
              Every sale invoice you've raised, with what's received and what's
              still outstanding.
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
              onClick={() => notReady("Invoice settings")}
            />
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <span className="pl-1 pr-1 text-sm font-medium text-slate-500">
            Filter by :
          </span>
          <PillSelect
            ariaLabel="Period"
            value={period}
            onChange={changePeriod}
            options={PERIOD_OPTIONS}
          />
          <span className={`${PILL} max-w-full flex-wrap justify-center`}>
            <Calendar size={15} className="shrink-0" />
            <input
              type="date"
              aria-label="From date"
              value={from}
              onChange={(e) => changeDate("from", e.target.value)}
              className="min-w-0 cursor-pointer bg-transparent text-sm font-medium text-[#1E4D96] focus:outline-none"
            />
            <span className="text-[#1E4D96]/60">To</span>
            <input
              type="date"
              aria-label="To date"
              value={to}
              onChange={(e) => changeDate("to", e.target.value)}
              className="min-w-0 cursor-pointer bg-transparent text-sm font-medium text-[#1E4D96] focus:outline-none"
            />
          </span>
          <PillSelect
            ariaLabel="Firm"
            value={firm}
            onChange={setFirm}
            options={FIRM_OPTIONS}
          />
          <PillSelect
            ariaLabel="User"
            value={user}
            onChange={setUser}
            options={USER_OPTIONS}
          />
        </div>

        {/* Summary */}
        <div className="mb-5">
          <div className="w-full rounded-2xl border border-[#DCE6F5] bg-gradient-to-br from-[#F4F7FD] to-white p-4 shadow-sm sm:max-w-sm">
            <p className="text-sm text-slate-500">Total Sales Amount</p>
            <p className="mt-0.5 text-2xl font-bold text-slate-900">
              {formatINR(totals.amount)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>
                Received:{" "}
                <span className="font-semibold text-emerald-600">
                  {formatINR(totals.received)}
                </span>
              </span>
              <span className="hidden h-3 w-px bg-slate-300 sm:inline-block" />
              <span>
                Balance:{" "}
                <span className="font-semibold text-rose-600">
                  {formatINR(totals.amount - totals.received)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="text-base font-semibold text-slate-900">
              Transactions
              <span className="ml-2 text-xs font-medium text-slate-400">
                {rows.length} {rows.length === 1 ? "entry" : "entries"}
              </span>
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
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                    onBlur={() => !query && setSearchOpen(false)}
                    placeholder="Search invoice, party…"
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
                onClick={() => notReady("The sales graph")}
              />
              <IconBtn
                icon={FileSpreadsheet}
                label="Export to Excel"
                className="hover:text-emerald-600"
                onClick={() => {
                  if (!rows.length) return toast.info("Nothing to export.");
                  downloadCsv(rows, from, to);
                  toast.success("Exported to CSV");
                }}
              />
              <IconBtn
                icon={Printer}
                label="Print list"
                onClick={() => notReady("Printing")}
              />
            </div>
          </div>

          {pageRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm">
                {sales.length === 0
                  ? "No sales yet. Add your first one."
                  : "No transactions match these filters."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Th label="Date" field="date" {...sortProps} />
                      <Th
                        label="Invoice no"
                        field="invoiceNumber"
                        {...sortProps}
                      />
                      <Th label="Party Name" field="partyName" {...sortProps}>
                        <ColumnFilter
                          label="party"
                          options={distinct(dateFiltered, "partyName")}
                          selected={colFilters.partyName}
                          onChange={(v) => setColFilter("partyName", v)}
                        />
                      </Th>
                      <Th label="Transaction">
                        <ColumnFilter
                          label="transaction"
                          options={distinct(dateFiltered, "transaction")}
                          selected={colFilters.transaction}
                          onChange={(v) => setColFilter("transaction", v)}
                        />
                      </Th>
                      <Th label="Payment Type">
                        <ColumnFilter
                          label="payment type"
                          options={distinct(dateFiltered, "paymentType")}
                          selected={colFilters.paymentType}
                          onChange={(v) => setColFilter("paymentType", v)}
                        />
                      </Th>
                      <Th
                        label="Amount"
                        field="amount"
                        align="right"
                        {...sortProps}
                      />
                      <Th
                        label="Balance"
                        field="balance"
                        align="right"
                        {...sortProps}
                      />
                      <th className="w-32 px-4 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageRows.map((s) => {
                      const balance = saleBalance(s);
                      const item = [s.productName, s.byProductName]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                            {isoToDMY(s.date)}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {s.invoiceNumber || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-[#1E4D96]">
                              {s.partyName || "—"}
                            </span>
                            {item && (
                              <span className="block text-xs text-slate-400">
                                {item}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {s.transaction}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {s.paymentType || "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-800">
                            {formatINR(s.amount)}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                              balance > 0 ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {formatINR(balance)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                type="button"
                                onClick={() => notReady("Invoice printing")}
                                aria-label={`Print invoice ${s.invoiceNumber}`}
                                title="Print"
                                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#1E4D96]"
                              >
                                <Printer size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => notReady("Sharing")}
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
                    Page {safePage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((n) => Math.max(1, n - 1))}
                      aria-label="Previous page"
                      className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
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
