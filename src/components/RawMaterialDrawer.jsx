import { useEffect, useRef } from "react";
import { X, Plus, Check } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import InfoTip from "./InfoTip";

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

// Required fields (matches the create/update API contract).
const REQUIRED = [
  "supplier",
  "invoiceNumber",
  "date",
  "size",
  "point",
  "grade",
  "quantity",
];

// Size / point / grade allow letters and numbers only (no special characters).
const alnum = (v) => v.replace(/[^a-zA-Z0-9]/g, "");

/**
 * RawMaterialDrawer
 * Right-side slide-in panel for creating / editing a purchase (raw-material /
 * Patta sheet). Fields: supplier, invoice number, date, size, point, grade,
 * quantity. The supplier picker resolves to a real party id (`partyId`).
 *
 * Form state lives in the parent (`formState` / `setFormState`).
 */
export default function RawMaterialDrawer({
  open,
  mode,
  formState,
  setFormState,
  saving,
  supplierOptions = [],
  closeOnEscape = true,
  onAddSupplier,
  onClose,
  onSubmit,
}) {
  const supplierRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => supplierRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Close on Escape + lock background scroll while open. `closeOnEscape` is
  // turned off while the party drawer is stacked on top.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape" && closeOnEscape) onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, closeOnEscape]);

  // Update a field and clear any validation error.
  const update = (field, value) =>
    setFormState((f) => ({ ...f, [field]: value, error: "", errorFields: [] }));

  // Resolve the typed/selected supplier name to a real party id.
  function pickSupplier(val) {
    const match = supplierOptions.find(
      (o) => o.name.trim().toLowerCase() === val.trim().toLowerCase(),
    );
    setFormState((f) => ({
      ...f,
      supplier: val,
      partyId: match ? match.id : "",
      error: "",
      errorFields: [],
    }));
  }

  function fieldMissing(name) {
    if (name === "supplier") return !formState.partyId;
    if (name === "quantity")
      return formState.quantity === "" || formState.quantity == null;
    return !String(formState[name] ?? "").trim();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const missing = REQUIRED.filter(fieldMissing);
    if (missing.length) {
      const supplierUnmatched = !formState.partyId && formState.supplier.trim();
      setFormState((f) => ({
        ...f,
        errorFields: missing,
        error: supplierUnmatched
          ? "Select a supplier from the list (or add a new one)."
          : "Please fill all required fields.",
      }));
      supplierRef.current?.focus();
      return;
    }
    setFormState((f) => ({ ...f, error: "", errorFields: [] }));
    onSubmit(e);
  }

  const errs = formState.errorFields || [];
  const fieldClass = (name) =>
    `w-full rounded-md border px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
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
        aria-label={mode === "add" ? "Add Purchase" : "Edit Purchase"}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {mode === "add" ? "Add Purchase" : "Edit Purchase"}
            </h3>
            <p className="text-xs text-slate-400">Patta — raw material stock</p>
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
          id="raw-material-form"
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
            {/* Supplier — searchable dropdown resolving to a party id. */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Supplier<span className="ml-0.5 text-rose-500">*</span>
              </span>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    inputRef={supplierRef}
                    value={formState.supplier}
                    onChange={pickSupplier}
                    options={supplierOptions.map((o) => o.name)}
                    placeholder="Search or select a supplier"
                    invalid={errs.includes("supplier")}
                    allowCustom={false}
                  />
                </div>
                <button
                  type="button"
                  onClick={onAddSupplier}
                  title="Add new supplier"
                  aria-label="Add new supplier"
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md border border-[#1E4D96] text-[#1E4D96] transition-colors hover:bg-[#1E4D96] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <Field label="Invoice Number" required>
              <input
                value={formState.invoiceNumber}
                onChange={(e) => update("invoiceNumber", e.target.value)}
                placeholder="e.g. INV-2024-001"
                className={fieldClass("invoiceNumber")}
              />
            </Field>

            <Field label="Date" required>
              <input
                type="date"
                value={formState.date}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => update("date", e.target.value)}
                className={fieldClass("date")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Size" required>
                <input
                  value={formState.size}
                  onChange={(e) => update("size", alnum(e.target.value))}
                  placeholder="e.g. 10"
                  className={fieldClass("size")}
                />
              </Field>
              <Field label="Point" required>
                <input
                  value={formState.point}
                  onChange={(e) => update("point", alnum(e.target.value))}
                  placeholder="e.g. 120p"
                  className={fieldClass("point")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Grade" required>
                <input
                  value={formState.grade}
                  onChange={(e) => update("grade", alnum(e.target.value))}
                  placeholder="e.g. M5"
                  className={fieldClass("grade")}
                />
              </Field>
              <Field label="Quantity (In kg)" required>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={formState.quantity}
                  onChange={(e) => update("quantity", e.target.value)}
                  placeholder="e.g. 250 (kg)"
                  className={fieldClass("quantity")}
                />
              </Field>
            </div>
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
            form="raw-material-form"
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
                ? "Add Purchase"
                : "Update Purchase"}
          </button>
        </div>
      </div>
    </div>
  );
}
