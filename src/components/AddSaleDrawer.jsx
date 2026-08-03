import { useEffect, useRef } from "react";
import { X, Plus, Check } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import InfoTip from "./InfoTip";
import { gmToKgDisplay } from "../utils/units";
import { PAYMENT_TYPES } from "../utils/sales";

const FIELD =
  "w-full rounded-md border px-3 py-2.5 text-sm text-slate-700 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-1";

function Field({ label, required, info, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="text-rose-500">*</span>}
        {info && <InfoTip text={info} />}
      </span>
      {children}
    </label>
  );
}

// Every field the create/update API takes is required.
const REQUIRED = [
  "partyId",
  "invoiceNumber",
  "date",
  "paymentType",
  "productId",
  "quantity",
];

/**
 * AddSaleDrawer
 * Right-side slide-in panel for creating / editing a sale.
 * Party and product pickers resolve to real ObjectIds (`partyId`/`productId`);
 * payment type is the API's fixed enum. Quantity is entered in kg — the parent
 * converts to grams for the wire.
 *
 * Form state lives in the parent (`formState` / `setFormState`).
 */
export default function AddSaleDrawer({
  open,
  mode,
  formState,
  setFormState,
  saving,
  partyOptions = [],
  productOptions = [],
  onClose,
  onSubmit,
}) {
  const partyRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => partyRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const update = (field, value) =>
    setFormState((f) => ({ ...f, [field]: value, error: "", errorFields: [] }));

  // Resolve the typed/selected name to the id the API wants.
  function pickFrom(options, nameKey, idKey) {
    return (val) => {
      const match = options.find(
        (o) => o.name.trim().toLowerCase() === val.trim().toLowerCase(),
      );
      setFormState((f) => ({
        ...f,
        [nameKey]: val,
        [idKey]: match ? match.id : "",
        error: "",
        errorFields: [],
      }));
    };
  }

  const selectedProduct =
    productOptions.find((p) => p.id === formState.productId) || null;

  function fieldMissing(name) {
    if (name === "quantity")
      return formState.quantity === "" || Number(formState.quantity) <= 0;
    return !String(formState[name] ?? "").trim();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const missing = REQUIRED.filter(fieldMissing);
    if (missing.length) {
      const unmatched =
        (!formState.partyId && formState.partyName.trim()) ||
        (!formState.productId && formState.productName.trim());
      setFormState((f) => ({
        ...f,
        errorFields: missing,
        error: unmatched
          ? "Pick the party and product from the list."
          : "Please fill all required fields.",
      }));
      return;
    }
    setFormState((f) => ({ ...f, error: "", errorFields: [] }));
    onSubmit(e);
  }

  const errs = formState.errorFields || [];
  const fieldClass = (name) =>
    `${FIELD} ${
      errs.includes(name)
        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-300"
        : "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30"
    }`;

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
        aria-label={mode === "add" ? "Add Sale" : "Edit Sale"}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {mode === "add" ? "Add Sale" : "Edit Sale"}
            </h3>
            <p className="text-xs text-slate-400">Sale invoice details</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <form
          id="sale-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          {formState.error && (
            <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {formState.error}
            </p>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date" required>
                <input
                  type="date"
                  value={formState.date}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => update("date", e.target.value)}
                  className={fieldClass("date")}
                />
              </Field>
              <Field label="Invoice Number" required>
                <input
                  value={formState.invoiceNumber}
                  onChange={(e) => update("invoiceNumber", e.target.value)}
                  placeholder="e.g. SAL-2024-001"
                  className={fieldClass("invoiceNumber")}
                />
              </Field>
            </div>

            {/* Party — resolves to partyId. */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Party Name<span className="ml-0.5 text-rose-500">*</span>
              </span>
              <SearchableSelect
                inputRef={partyRef}
                value={formState.partyName}
                onChange={pickFrom(partyOptions, "partyName", "partyId")}
                options={partyOptions.map((o) => o.name)}
                placeholder="Search or select a party"
                invalid={errs.includes("partyId")}
                allowCustom={false}
              />
            </div>

            {/* Product — resolves to productId. */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Product Name<span className="ml-0.5 text-rose-500">*</span>
              </span>
              <SearchableSelect
                value={formState.productName}
                onChange={pickFrom(productOptions, "productName", "productId")}
                options={productOptions.map((o) => o.name)}
                placeholder="Search or select a product"
                invalid={errs.includes("productId")}
                allowCustom={false}
              />
              {selectedProduct && (
                <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                  <span className="font-medium text-slate-600">In stock:</span>
                  <span className="font-semibold text-slate-800">
                    {gmToKgDisplay(selectedProduct.totalQtyGm)} kg
                  </span>
                  <InfoTip text="This value is in kg." />
                </div>
              )}
            </div>

            <Field label="Payment Type" required>
              <select
                value={formState.paymentType}
                onChange={(e) => update("paymentType", e.target.value)}
                className={`${fieldClass("paymentType")} ${
                  formState.paymentType ? "text-slate-700" : "text-slate-400"
                }`}
              >
                <option value="">-- Select Payment Type --</option>
                {PAYMENT_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Quantity (In kg)" required info="Enter quantity in kg.">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={formState.quantity}
                onChange={(e) => update("quantity", e.target.value)}
                placeholder="e.g. 100 (kg)"
                className={fieldClass("quantity")}
              />
            </Field>
          </div>
        </form>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="sale-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-[#1E4D96] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A] disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
          >
            {mode === "add" ? (
              <Plus size={16} strokeWidth={2.5} />
            ) : (
              <Check size={16} strokeWidth={2.5} />
            )}
            {saving
              ? mode === "add"
                ? "Adding…"
                : "Updating…"
              : mode === "add"
                ? "Add Sale"
                : "Update Sale"}
          </button>
        </div>
      </div>
    </div>
  );
}
