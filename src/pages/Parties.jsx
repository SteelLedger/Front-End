import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  Search,
  Printer,
  FileSpreadsheet,
  Plus,
  Pencil,
  MessageCircle,
  Phone,
  Clock,
  MoreVertical,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Trash2,
  TrendingUp,
  ShoppingCart,
  Wallet,
  Inbox,
  Loader2,
} from "lucide-react";
import AddPartyDrawer from "../components/AddPartyDrawer";
import PartyFilter from "../components/PartyFilter";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  emptyAddress,
  todayISO,
  dmyToISO,
  emptyPartyForm,
  buildPartyPayload,
} from "../utils/party";
import {
  GetParties,
  getPartyById,
  createParty,
  updateParty,
  DeleteParty,
} from "../services/apiServices";

const PAGE_SIZE = 10;

// Backend field names assumed for sorting — adjust if the API differs.
const SORT_FIELD = { name: "name", amount: "amount" };

/* ----------------------------- Mock transactions ----------------------------
 * The transactions endpoint isn't ready yet, so the detail panel shows this
 * static placeholder for whichever party is selected. Swap for a real
 * GET /parties/:id/transactions call once it exists.
 * -------------------------------------------------------------------------- */
const MOCK_TRANSACTIONS = [
  {
    id: 101,
    type: "Sale",
    number: "1530",
    date: "14/06/2026",
    total: 11,
    balance: 11,
  },
  {
    id: 102,
    type: "Sale",
    number: "1498",
    date: "28/05/2026",
    total: 2266,
    balance: 2266,
  },
  {
    id: 103,
    type: "Payment In",
    number: "PAY-88",
    date: "18/05/2026",
    total: 3000,
    balance: 0,
  },
];

const TYPE_META = {
  Sale: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  Purchase: { icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
  "Payment In": {
    icon: ArrowDownLeft,
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
  "Payment Out": {
    icon: ArrowUpRight,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  "Opening Balance": {
    icon: Wallet,
    color: "text-slate-500",
    bg: "bg-slate-100",
  },
};

const PARTY_TYPE_META = {
  customer: { label: "Customer", color: "text-blue-700", bg: "bg-blue-50" },
  supplier: { label: "Supplier", color: "text-purple-700", bg: "bg-purple-50" },
};

const AVATAR_PALETTE = [
  { bg: "#DBEAFE", text: "#1D4ED8" },
  { bg: "#DCFCE7", text: "#15803D" },
  { bg: "#FEF3C7", text: "#B45309" },
  { bg: "#F3E8FF", text: "#7E22CE" },
  { bg: "#CCFBF1", text: "#0F766E" },
  { bg: "#FFE4E6", text: "#BE123C" },
];

function getInitials(name) {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getAvatarColors(name) {
  const sum = String(name || "")
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function formatINR(amount) {
  return `₹${Math.abs(Math.round(amount || 0)).toLocaleString("en-IN")}`;
}

// Map a raw party from the API into the shape the list/detail render with.
// The list returns a positive `amount` plus a `balanceType` direction.
function normalizeParty(raw) {
  const num = Number(raw.amount ?? raw.balance ?? 0) || 0;
  const signed =
    raw.balanceType === "to_pay"
      ? -Math.abs(num)
      : raw.balanceType === "to_receive"
        ? Math.abs(num)
        : num;
  return {
    ...raw,
    id: raw._id ?? raw.id,
    name: raw.name || "",
    phone: raw.phone || "",
    amount: signed,
    type: signed < 0 ? "supplier" : "customer",
  };
}

// Dig the list + total out of the response envelope
// ({ data: [...], meta: { pagination: { total } } }).
function extractParties(res) {
  const body = res?.data ?? {};
  const d = body.data ?? body;
  const list = Array.isArray(d)
    ? d
    : (d.parties ?? d.results ?? d.items ?? d.docs ?? []);
  const pg = body.meta?.pagination ?? {};
  const total =
    pg.total ??
    d.total ??
    d.totalCount ??
    d.count ??
    (Array.isArray(list) ? list.length : 0);
  return { list: Array.isArray(list) ? list : [], total: Number(total) || 0 };
}

// Map a full party (GET /parties/:id) into the drawer form. Address state/country
// come back as populated objects; opening balance is a nested object.
function partyToForm(d) {
  const addrFromApi = (a) => ({
    _id: a._id,
    addressLabel: a.addressLabel || "",
    addressLine1: a.addressLine1 || "",
    addressLine2: a.addressLine2 || "",
    city: a.city || "",
    pincode: a.pincode || "",
    stateId:
      typeof a.stateId === "object" ? (a.stateId?._id ?? "") : a.stateId || "",
    countryId:
      typeof a.countryId === "object"
        ? (a.countryId?._id ?? "")
        : a.countryId || "",
  });
  const billing =
    Array.isArray(d.billingAddresses) && d.billingAddresses.length
      ? d.billingAddresses.map(addrFromApi)
      : [emptyAddress()];
  const shipping =
    Array.isArray(d.shippingAddresses) && d.shippingAddresses.length
      ? d.shippingAddresses.map(addrFromApi)
      : [emptyAddress()];
  const ob = d.openingBalance;
  const obObj = ob && typeof ob === "object";
  const obAmount = obObj ? ob.amount : ob;
  const obDate = obObj ? ob.asOfDate : d.asOfDate;
  return {
    ...emptyPartyForm(),
    name: d.name || "",
    phone: d.phone || "",
    email: d.email || "",
    billingName: d.billingName || "",
    tin: d.tin || "",
    billingAddresses: billing,
    shippingAddresses: shipping,
    openingBalance: obAmount != null ? String(obAmount) : "",
    asOfDate: obDate ? dmyToISO(obDate) : todayISO(),
    balanceType: (obObj && ob.balanceType) || d.balanceType || "to_receive",
  };
}

function getStatus(txn) {
  const bal = Math.abs(txn.balance);
  const tot = Math.abs(txn.total);
  if (bal === 0)
    return { label: "Paid", color: "text-emerald-700", bg: "bg-emerald-50" };
  if (tot === 0 || bal === tot)
    return { label: "Pending", color: "text-amber-700", bg: "bg-amber-50" };
  return { label: "Partial", color: "text-blue-700", bg: "bg-blue-50" };
}

/* ------------------------------- Small UI bits ------------------------------- */

function StatCard({ icon: Icon, iconBg, iconColor, label, value, valueColor }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
      <span
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p
          className={`text-lg font-semibold truncate ${valueColor || "text-slate-900"}`}
        >
          {value}
        </p>
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

function IconButton({ children, title, colorClass }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1E4D96]/50 ${colorClass}`}
    >
      {children}
    </button>
  );
}

function HeaderIconButton({ children, title, onClick }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1E4D96]/50"
    >
      {children}
    </button>
  );
}

/* ----------------------------------- Page ----------------------------------- */

function Parties() {
  // Server-driven list state
  const [parties, setParties] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterValues, setFilterValues] = useState([]); // active/inactive/to_receive/to_pay
  const [sortKey, setSortKey] = useState(null); // "name" | "amount"
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState(null);

  // Drawer / form state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(emptyPartyForm);
  const [saving, setSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Confirmation modal: { title, message, confirmLabel, onConfirm } | null
  const [confirmState, setConfirmState] = useState(null);

  // Transactions (mock placeholder)
  const [txns, setTxns] = useState(MOCK_TRANSACTIONS);
  const [txnFilter, setTxnFilter] = useState("All");
  const [txnSearchOpen, setTxnSearchOpen] = useState(false);
  const [txnSearch, setTxnSearch] = useState("");
  const [openMenuTxnId, setOpenMenuTxnId] = useState(null);

  const detailRef = useRef(null);
  const menuRef = useRef(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Debounce the search box (and reset to page 1).
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [query]);

  const fetchParties = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const res = await GetParties({
        search: debouncedQuery,
        filter: filterValues,
        sortBy: sortKey ? SORT_FIELD[sortKey] : undefined,
        sortOrder: sortKey ? sortDir : undefined,
        page,
        limit: PAGE_SIZE,
      });
      const { list, total: t } = extractParties(res);
      const normalized = list.map(normalizeParty);
      setParties(normalized);
      setTotal(t);
      setSelectedId((cur) =>
        cur && normalized.some((p) => p.id === cur)
          ? cur
          : (normalized[0]?.id ?? null),
      );
    } catch (err) {
      setParties([]);
      setListError("Couldn't load parties.");
      toast.error(err?.response?.data?.message || "Failed to load parties");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filterValues, sortKey, sortDir, page]);

  useEffect(() => {
    // Legitimate data-fetch on mount / when query params change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchParties();
  }, [fetchParties]);

  // Close the transaction row menu on outside click.
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuTxnId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedParty = parties.find((p) => p.id === selectedId) || null;

  const filteredTransactions = useMemo(() => {
    let list = txns;
    if (txnFilter === "Sale") list = list.filter((t) => t.type === "Sale");
    else if (txnFilter === "Purchase")
      list = list.filter((t) => t.type === "Purchase");
    else if (txnFilter === "Payments")
      list = list.filter((t) => t.type.startsWith("Payment"));
    if (txnSearch.trim()) {
      const q = txnSearch.trim().toLowerCase();
      list = list.filter((t) => t.number.toLowerCase().includes(q));
    }
    return list;
  }, [txns, txnFilter, txnSearch]);

  // Best-effort totals from the current page (no summary endpoint yet).
  const pageTotals = useMemo(() => {
    const toCollect = parties
      .filter((p) => p.amount > 0)
      .reduce((s, p) => s + p.amount, 0);
    const toPay = parties
      .filter((p) => p.amount < 0)
      .reduce((s, p) => s + Math.abs(p.amount), 0);
    return { toCollect, toPay };
  }, [parties]);

  function handleSelectParty(id) {
    setSelectedId(id);
    setTxns(MOCK_TRANSACTIONS);
    setTxnFilter("All");
    setTxnSearch("");
    setTxnSearchOpen(false);
    setOpenMenuTxnId(null);
    requestAnimationFrame(() => {
      if (window.innerWidth < 1024 && detailRef.current) {
        const reduceMotion =
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        detailRef.current.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      }
    });
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function openAddModal() {
    setModalMode("add");
    setEditingId(null);
    setFormState(emptyPartyForm());
    setModalOpen(true);
  }

  // Open edit immediately with the row's name, then fetch the full party to
  // prefill the rest (addresses, contact, opening balance).
  async function openEditModal(party) {
    setModalMode("edit");
    setEditingId(party.id);
    setFormState({ ...emptyPartyForm(), name: party.name || "" });
    setModalOpen(true);
    setEditLoading(true);
    try {
      const res = await getPartyById(party.id);
      const detail = res?.data?.data ?? res?.data ?? {};
      setFormState(partyToForm(detail));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Couldn't load party details",
      );
    } finally {
      setEditLoading(false);
    }
  }

  async function handleSaveParty(e) {
    e.preventDefault();
    if (!formState.name.trim()) return; // drawer surfaces the field error
    setSaving(true);
    try {
      const payload = buildPartyPayload(formState);
      if (modalMode === "add") {
        await createParty(payload);
        toast.success("Party added");
        setPage(1);
      } else {
        await updateParty(editingId, payload);
        toast.success("Party updated");
      }
      await fetchParties();
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save party");
    } finally {
      setSaving(false);
    }
  }

  function requestDeleteParty(party, e) {
    e?.stopPropagation();
    setConfirmState({
      title: "Delete party?",
      message: `Are you sure you want to delete "${party.name}"? This can't be undone.`,
      confirmLabel: "Yes, delete",
      onConfirm: () => doDeleteParty(party),
    });
  }

  async function doDeleteParty(party) {
    try {
      await DeleteParty(party.id);
      toast.success("Party deleted");
      if (selectedId === party.id) setSelectedId(null);
      // If we just removed the last row on a page, step back one page.
      if (parties.length === 1 && page > 1) setPage((p) => p - 1);
      else fetchParties();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't delete party");
    }
  }

  function requestDeleteTransaction(txnId) {
    setOpenMenuTxnId(null);
    setConfirmState({
      title: "Delete transaction?",
      message: "Are you sure you want to delete this transaction? This can't be undone.",
      confirmLabel: "Yes, delete",
      onConfirm: () => setTxns((prev) => prev.filter((t) => t.id !== txnId)),
    });
  }

  function handlePrint() {
    window.print();
  }

  function handleExportCSV() {
    if (!selectedParty) return;
    const header = ["Type", "Number", "Date", "Total", "Balance"];
    const rows = filteredTransactions.map((t) => [
      t.type,
      t.number,
      t.date,
      t.total,
      t.balance,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedParty.name.replace(/\s+/g, "_")}_transactions.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5 space-y-4 lg:space-y-5">
      <div className="max-w-[1400px] mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Parties Overview
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Monitor customer and supplier relationships, track pending
              collections, and stay on top of payments to maintain healthy cash
              flow.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1E4D96] hover:bg-[#1A3F7A] active:bg-[#15356A] text-white font-medium text-sm px-5 py-2.5 shadow-sm shadow-blue-200 transition-colors w-full sm:w-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1E4D96]/50"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Party
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Total Parties"
            value={String(total)}
          />
          <StatCard
            icon={ArrowDownLeft}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="To Collect"
            value={formatINR(pageTotals.toCollect)}
            valueColor="text-emerald-600"
          />
          <StatCard
            icon={ArrowUpRight}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
            label="To Pay"
            value={formatINR(pageTotals.toPay)}
            valueColor="text-rose-600"
          />
        </div>

        {/* Main panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:flex-row">
          {/* Party list */}
          <div className="lg:w-[340px] lg:shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search party name"
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

            <div className="flex items-center justify-between px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wide border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleSort("name")}
                  className="flex items-center gap-1 hover:text-slate-600"
                >
                  Party Name{" "}
                  <SortIcon active={sortKey === "name"} dir={sortDir} />
                </button>
                <PartyFilter
                  value={filterValues}
                  onChange={(v) => {
                    setFilterValues(v);
                    setPage(1);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => toggleSort("amount")}
                className="flex items-center gap-1 hover:text-slate-600"
              >
                Amount <SortIcon active={sortKey === "amount"} dir={sortDir} />
              </button>
            </div>

            <div className="max-h-[420px] lg:max-h-[560px] overflow-y-auto no-scrollbar divide-y divide-slate-100 relative">
              {loading ? (
                <div className="p-8 flex items-center justify-center text-slate-400">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : listError ? (
                <div className="p-6 text-center text-sm text-rose-500">
                  {listError}
                  <button
                    type="button"
                    onClick={fetchParties}
                    className="block mx-auto mt-2 text-[#1E4D96] font-medium hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : parties.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  {query || filterValues.length
                    ? "No parties match your search or filters."
                    : "No parties yet. Add your first one."}
                </div>
              ) : (
                parties.map((p) => {
                  const isActive = p.id === selectedId;
                  const colors = getAvatarColors(p.name);
                  return (
                    <div key={p.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => handleSelectParty(p.id)}
                        className={`w-full flex items-center gap-3 pl-4 pr-12 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E4D96]/40 ${
                          isActive ? "bg-blue-50/60" : "hover:bg-slate-50"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1E4D96] rounded-r" />
                        )}
                        <span
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                          }}
                        >
                          {getInitials(p.name)}
                        </span>
                        <span
                          className={`flex-1 truncate text-sm ${isActive ? "font-semibold text-slate-900" : "text-slate-700"}`}
                        >
                          {p.name}
                        </span>
                        <span
                          className={`text-sm font-medium shrink-0 ${
                            p.amount > 0
                              ? "text-emerald-600"
                              : p.amount < 0
                                ? "text-rose-600"
                                : "text-slate-400"
                          }`}
                        >
                          {formatINR(p.amount)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => requestDeleteParty(p, e)}
                        aria-label={`Delete ${p.name}`}
                        title="Delete party"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div ref={detailRef} className="flex-1 min-w-0 flex flex-col">
            {selectedParty ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                      style={{
                        backgroundColor: getAvatarColors(selectedParty.name).bg,
                        color: getAvatarColors(selectedParty.name).text,
                      }}
                    >
                      {getInitials(selectedParty.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900 truncate">
                          {selectedParty.name}
                        </h2>
                        <button
                          type="button"
                          onClick={() => openEditModal(selectedParty)}
                          aria-label="Edit party"
                          title="Edit party"
                          className="text-slate-400 hover:text-[#1E4D96] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1E4D96]/50 rounded"
                        >
                          <Pencil size={15} />
                        </button>
                        {PARTY_TYPE_META[selectedParty.type] && (
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PARTY_TYPE_META[selectedParty.type].bg} ${PARTY_TYPE_META[selectedParty.type].color}`}
                          >
                            {PARTY_TYPE_META[selectedParty.type].label}
                          </span>
                        )}
                      </div>
                      {selectedParty.phone && (
                        <p className="text-xs text-slate-400">
                          {selectedParty.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconButton
                      title="Message"
                      colorClass="bg-amber-50 text-amber-600 hover:bg-amber-100"
                    >
                      <MessageCircle size={16} />
                    </IconButton>
                    <IconButton
                      title="WhatsApp"
                      colorClass="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    >
                      <Phone size={16} />
                    </IconButton>
                    <IconButton
                      title="Set reminder"
                      colorClass="bg-orange-50 text-orange-600 hover:bg-orange-100"
                    >
                      <Clock size={16} />
                    </IconButton>
                  </div>
                </div>

                <div className="flex-1 flex flex-col p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="text-base font-semibold text-slate-900">
                      Transactions
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {txnSearchOpen && (
                        <input
                          autoFocus
                          value={txnSearch}
                          onChange={(e) => setTxnSearch(e.target.value)}
                          placeholder="Search number..."
                          className="text-sm rounded-lg border border-slate-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1E4D96]/30 focus:border-[#1E4D96] w-32 sm:w-44"
                        />
                      )}
                      <HeaderIconButton
                        title="Search transactions"
                        onClick={() => setTxnSearchOpen((s) => !s)}
                      >
                        <Search size={16} />
                      </HeaderIconButton>
                      <HeaderIconButton title="Print" onClick={handlePrint}>
                        <Printer size={16} />
                      </HeaderIconButton>
                      <HeaderIconButton
                        title="Export CSV"
                        onClick={handleExportCSV}
                      >
                        <FileSpreadsheet size={16} />
                      </HeaderIconButton>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {["All", "Sale", "Purchase", "Payments"].map((f) => (
                      <button
                        type="button"
                        key={f}
                        onClick={() => setTxnFilter(f)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1E4D96]/40 ${
                          txnFilter === f
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {f === "Sale"
                          ? "Sales"
                          : f === "Purchase"
                            ? "Purchases"
                            : f}
                      </button>
                    ))}
                  </div>

                  {filteredTransactions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-slate-400">
                      <Inbox size={32} className="mb-2" />
                      <p className="text-sm">No transactions found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-4 sm:-mx-5">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide border-b border-slate-100">
                            <th className="py-2 px-4 sm:px-5 font-medium">
                              Type
                            </th>
                            <th className="py-2 px-3 font-medium">Number</th>
                            <th className="py-2 px-3 font-medium">Date</th>
                            <th className="py-2 px-3 font-medium text-right">
                              Total
                            </th>
                            <th className="py-2 px-3 font-medium text-right">
                              Balance
                            </th>
                            <th className="py-2 px-3 font-medium text-right">
                              Status
                            </th>
                            <th className="py-2 px-4 sm:px-5 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredTransactions.map((t) => {
                            const meta =
                              TYPE_META[t.type] || TYPE_META["Opening Balance"];
                            const Icon = meta.icon;
                            const status = getStatus(t);
                            return (
                              <tr key={t.id} className="hover:bg-slate-50/70">
                                <td className="py-3 px-4 sm:px-5">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span
                                      className={`w-6 h-6 rounded-md flex items-center justify-center ${meta.bg} ${meta.color}`}
                                    >
                                      <Icon size={13} />
                                    </span>
                                    <span className="text-slate-700">
                                      {t.type}
                                    </span>
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-slate-500">
                                  {t.number}
                                </td>
                                <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                                  {t.date}
                                </td>
                                <td className="py-3 px-3 text-right font-medium text-slate-800">
                                  {formatINR(t.total)}
                                </td>
                                <td
                                  className={`py-3 px-3 text-right font-medium ${
                                    t.balance > 0
                                      ? "text-emerald-600"
                                      : t.balance < 0
                                        ? "text-rose-600"
                                        : "text-slate-400"
                                  }`}
                                >
                                  {formatINR(t.balance)}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <span
                                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}
                                  >
                                    {status.label}
                                  </span>
                                </td>
                                <td className="py-3 px-4 sm:px-5 text-right relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenMenuTxnId(
                                        openMenuTxnId === t.id ? null : t.id,
                                      )
                                    }
                                    aria-label="More actions"
                                    className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#1E4D96]/50"
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                  {openMenuTxnId === t.id && (
                                    <div
                                      ref={menuRef}
                                      className="absolute right-4 top-10 z-10 w-32 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-left"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          requestDeleteTransaction(t.id)
                                        }
                                        className="w-full text-left text-sm text-rose-600 hover:bg-rose-50 px-3 py-2 flex items-center gap-2"
                                      >
                                        <Trash2 size={14} /> Delete
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-slate-400">
                <Users size={32} className="mb-2" />
                <p className="text-sm">
                  Select a party to view their transactions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddPartyDrawer
        open={modalOpen}
        mode={modalMode}
        formState={formState}
        setFormState={setFormState}
        saving={saving}
        loading={editLoading}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveParty}
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

export default Parties;
