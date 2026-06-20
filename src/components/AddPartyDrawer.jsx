import { useEffect, useRef, useState, useCallback } from "react";
import { X, Settings, Plus, Trash2 } from "lucide-react";
import {
  GetAllCountryList,
  GetAllStateListByCountryId,
} from "../services/apiServices";
import { emptyAddress } from "../utils/party";

const FIELD_CLASS =
  "w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700 " +
  "placeholder:text-slate-400 focus:outline-none focus:border-[#1E4D96] focus:ring-1 focus:ring-[#1E4D96]/30";

// Pull a list out of an unknown response envelope.
function extractList(res) {
  const body = res?.data ?? {};
  const d = body.data ?? body;
  if (Array.isArray(d)) return d;
  const arr =
    d.countries ?? d.states ?? d.results ?? d.items ?? d.docs ?? d.data ?? [];
  return Array.isArray(arr) ? arr : [];
}
const optId = (o) => o?._id ?? o?.id ?? "";
const optName = (o) => o?.name ?? o?.stateName ?? o?.countryName ?? "";

/**
 * AddPartyDrawer
 * Wide right-side slide-in panel for creating / editing a party. Supports
 * multiple billing & shipping addresses, country/state dropdowns sourced from
 * the location APIs, and a date picker for the opening-balance date.
 *
 * Form state lives in the parent (`formState` / `setFormState`).
 */
export default function AddPartyDrawer({
  open,
  mode,
  formState,
  setFormState,
  saving,
  loading,
  onClose,
  onSubmit,
}) {
  const nameRef = useRef(null);
  const [tab, setTab] = useState("tax"); // "tax" | "credit"
  const [countries, setCountries] = useState([]);
  const [statesByCountry, setStatesByCountry] = useState({});
  const [nameError, setNameError] = useState("");

  // Reset to the first tab each time the drawer opens, and focus the name field.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      setTab("tax");
      setNameError("");
      nameRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Party name is the only required field; validate before handing off to save.
  function handleSubmit(e) {
    e.preventDefault();
    if (!formState.name.trim()) {
      setNameError("Party name is required.");
      nameRef.current?.focus();
      return;
    }
    setNameError("");
    onSubmit(e);
  }

  // Close on Escape + lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Load country master data once.
  useEffect(() => {
    let alive = true;
    GetAllCountryList()
      .then((res) => alive && setCountries(extractList(res)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const ensureStates = useCallback(
    (countryId) => {
      if (!countryId || statesByCountry[countryId]) return;
      GetAllStateListByCountryId(countryId)
        .then((res) =>
          setStatesByCountry((m) => ({ ...m, [countryId]: extractList(res) })),
        )
        .catch(() => {});
    },
    [statesByCountry],
  );

  // Make sure states are loaded for any country already chosen (e.g. on edit).
  useEffect(() => {
    const ids = new Set();
    formState.billingAddresses?.forEach(
      (a) => a.countryId && ids.add(a.countryId),
    );
    formState.shippingAddresses?.forEach(
      (a) => a.countryId && ids.add(a.countryId),
    );
    ids.forEach((id) => ensureStates(id));
  }, [formState.billingAddresses, formState.shippingAddresses, ensureStates]);

  const set = (patch) => setFormState((f) => ({ ...f, ...patch }));
  const updateAddress = (kind, index, patch) =>
    setFormState((f) => ({
      ...f,
      [kind]: f[kind].map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
  const addAddress = (kind) =>
    setFormState((f) => ({ ...f, [kind]: [...f[kind], emptyAddress()] }));
  const removeAddress = (kind, index) =>
    setFormState((f) => ({
      ...f,
      [kind]: f[kind].filter((_, i) => i !== index),
    }));

  function renderAddressCards(kind, addLabel) {
    const list = formState[kind] || [];
    return (
      <>
        <div className="space-y-4">
          {list.map((addr, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border border-slate-200 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Address {i + 1}
                </span>
                {list.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAddress(kind, i)}
                    aria-label="Remove address"
                    className="text-slate-400 transition-colors hover:text-rose-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <input
                value={addr.addressLabel}
                onChange={(e) =>
                  updateAddress(kind, i, { addressLabel: e.target.value })
                }
                placeholder="Address Label (e.g. Head Office)"
                className={FIELD_CLASS}
              />
              <input
                value={addr.addressLine1}
                onChange={(e) =>
                  updateAddress(kind, i, { addressLine1: e.target.value })
                }
                placeholder="Address Line 1"
                className={FIELD_CLASS}
              />
              <input
                value={addr.addressLine2}
                onChange={(e) =>
                  updateAddress(kind, i, { addressLine2: e.target.value })
                }
                placeholder="Address Line 2"
                className={FIELD_CLASS}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={addr.city}
                  onChange={(e) =>
                    updateAddress(kind, i, { city: e.target.value })
                  }
                  placeholder="City"
                  className={FIELD_CLASS}
                />
                <input
                  value={addr.pincode}
                  onChange={(e) =>
                    updateAddress(kind, i, { pincode: e.target.value })
                  }
                  placeholder="Pincode"
                  className={FIELD_CLASS}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={addr.countryId}
                  onChange={(e) => {
                    updateAddress(kind, i, {
                      countryId: e.target.value,
                      stateId: "",
                    });
                    ensureStates(e.target.value);
                  }}
                  className={`${FIELD_CLASS} ${addr.countryId ? "text-slate-700" : "text-slate-400"}`}
                >
                  <option value="">Select Country</option>
                  {countries.map((c) => (
                    <option key={optId(c)} value={optId(c)}>
                      {optName(c)}
                    </option>
                  ))}
                </select>
                <select
                  value={addr.stateId}
                  onChange={(e) =>
                    updateAddress(kind, i, { stateId: e.target.value })
                  }
                  disabled={!addr.countryId}
                  className={`${FIELD_CLASS} disabled:bg-slate-50 ${addr.stateId ? "text-slate-700" : "text-slate-400"}`}
                >
                  <option value="">
                    {addr.countryId ? "Select State" : "Select country first"}
                  </option>
                  {(statesByCountry[addr.countryId] || []).map((s) => (
                    <option key={optId(s)} value={optId(s)}>
                      {optName(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => addAddress(kind)}
          className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#1E4D96] hover:underline"
        >
          <Plus size={13} /> {addLabel}
        </button>
      </>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "add" ? "Add Party" : "Edit Party"}
        className={`absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">
            {mode === "add" ? "Add Party" : "Edit Party"}
          </h3>
          <div className="flex items-center gap-4 text-slate-400">
            <Settings
              size={20}
              className="cursor-pointer hover:text-slate-600"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {loading && (
          <div className="border-b border-blue-100 bg-blue-50 px-6 py-1.5 text-center text-xs font-medium text-[#1E4D96]">
            Loading party details…
          </div>
        )}

        {/* Body (scrollable) */}
        <form
          id="add-party-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          {/* Name + phone */}
          <div className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <input
                ref={nameRef}
                value={formState.name}
                onChange={(e) => {
                  set({ name: e.target.value });
                  if (nameError) setNameError("");
                }}
                placeholder="Party Name *"
                aria-invalid={!!nameError}
                className={`w-full rounded-md border px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                  nameError
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-300"
                    : "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30"
                }`}
              />
              {nameError && (
                <p className="mt-1 text-xs text-rose-600">{nameError}</p>
              )}
            </div>
            <input
              value={formState.phone}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="Phone Number"
              className={FIELD_CLASS}
            />
          </div>

          {/* Tabs */}
          <div className="mt-6 flex items-center gap-8 border-b border-slate-200">
            <TabButton active={tab === "tax"} onClick={() => setTab("tax")}>
              Tax &amp; Address
            </TabButton>
            <TabButton
              active={tab === "credit"}
              onClick={() => setTab("credit")}
              badge="New"
            >
              Credit &amp; Balance
            </TabButton>
          </div>

          {/* Tab: Tax & Address */}
          {tab === "tax" && (
            <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(200px,240px)_1fr_1fr]">
              <div className="space-y-4">
                <input
                  value={formState.billingName}
                  onChange={(e) => set({ billingName: e.target.value })}
                  placeholder="Billing Name"
                  className={FIELD_CLASS}
                />
                <input
                  value={formState.tin}
                  onChange={(e) => set({ tin: e.target.value })}
                  placeholder="TIN"
                  className={FIELD_CLASS}
                />
                <input
                  type="email"
                  value={formState.email}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="Email ID"
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-800">
                  Billing Address
                </h4>
                {renderAddressCards("billingAddresses", "Add Billing Address")}
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-800">
                  Shipping Address
                </h4>
                <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={formState.sameAsShipping}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormState((f) => ({
                          ...f,
                          sameAsShipping: true,
                          shippingAddresses: f.billingAddresses.map((a) => {
                            const copy = { ...a };
                            delete copy._id;
                            return copy;
                          }),
                        }));
                      } else {
                        set({ sameAsShipping: false });
                      }
                    }}
                    className="h-3.5 w-3.5 accent-[#1E4D96]"
                  />
                  Same as billing address
                </label>
                {formState.sameAsShipping ? (
                  <p className="text-xs text-slate-400">
                    Shipping address will match the billing address.
                  </p>
                ) : (
                  renderAddressCards(
                    "shippingAddresses",
                    "Add Shipping Address",
                  )
                )}
              </div>
            </div>
          )}

          {/* Tab: Credit & Balance */}
          {tab === "credit" && (
            <div className="mt-6">
              <div className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
                <FloatingField label="Opening Balance">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={formState.openingBalance}
                    onChange={(e) => set({ openingBalance: e.target.value })}
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-700 outline-none"
                  />
                </FloatingField>
                <FloatingField label="As Of Date">
                  <input
                    type="date"
                    value={formState.asOfDate}
                    onChange={(e) => set({ asOfDate: e.target.value })}
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-700 outline-none"
                  />
                </FloatingField>
              </div>

              <div className="mt-5 flex items-center gap-8">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="balanceType"
                    checked={formState.balanceType === "to_pay"}
                    onChange={() => set({ balanceType: "to_pay" })}
                    className="h-4 w-4 accent-[#1E4D96]"
                  />
                  To Pay
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="balanceType"
                    checked={formState.balanceType === "to_receive"}
                    onChange={() => set({ balanceType: "to_receive" })}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  To Receive
                </label>
              </div>

              {/* <div className="mt-6">
                <div className="flex items-center gap-1.5 text-sm text-slate-700">
                  Credit Limit
                  <Info size={14} className="text-slate-400" />
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm font-semibold">
                  <span
                    className={
                      formState.creditLimitType === "none"
                        ? "text-[#1E4D96]"
                        : "text-slate-400"
                    }
                  >
                    No Limit
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formState.creditLimitType === "custom"}
                    onClick={() =>
                      set({
                        creditLimitType:
                          formState.creditLimitType === "custom"
                            ? "none"
                            : "custom",
                      })
                    }
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      formState.creditLimitType === "custom"
                        ? "bg-[#1E4D96]"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        formState.creditLimitType === "custom"
                          ? "translate-x-4"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <span
                    className={
                      formState.creditLimitType === "custom"
                        ? "text-[#1E4D96]"
                        : "text-slate-400"
                    }
                  >
                    Custom Limit
                  </span>
                </div>
                {formState.creditLimitType === "custom" && (
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={formState.creditLimit}
                    onChange={(e) => set({ creditLimit: e.target.value })}
                    placeholder="Enter credit limit"
                    className={`${FIELD_CLASS} mt-3 max-w-xs`}
                  />
                )}
              </div> */}
            </div>
          )}
        </form>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="submit"
            form="add-party-form"
            disabled={saving || loading}
            className="rounded-md bg-[#1E4D96] px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A] disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
          >
            {saving
              ? mode === "add"
                ? "Saving…"
                : "Updating…"
              : mode === "add"
                ? "Save"
                : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative -mb-px flex items-center gap-2 pb-2.5 text-sm font-semibold transition-colors ${
        active
          ? "border-b-2 border-[#1E4D96] text-[#1E4D96]"
          : "text-slate-400 hover:text-slate-600"
      }`}
    >
      {children}
      {badge && (
        <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function FloatingField({ label, children }) {
  return (
    <div className="relative rounded-md border border-slate-300 focus-within:border-[#1E4D96] focus-within:ring-1 focus-within:ring-[#1E4D96]/30">
      <span className="absolute -top-2 left-2 bg-white px-1 text-[11px] text-slate-400">
        {label}
      </span>
      {children}
    </div>
  );
}
