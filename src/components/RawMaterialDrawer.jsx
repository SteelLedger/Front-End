import { useEffect, useRef } from "react";
import { X, Plus, Check } from "lucide-react";
import SearchableSelect from "./SearchableSelect";

const FIELD_CLASS =
  "w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700 " +
  "placeholder:text-slate-400 focus:outline-none focus:border-[#1E4D96] focus:ring-1 focus:ring-[#1E4D96]/30";

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

/**
 * RawMaterialDrawer
 * Right-side slide-in panel for creating / editing a raw-material (Patta) sheet.
 * Fields: supplier, date, size, point, grade, quantity.
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

  // Focus the first field each time the drawer opens.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => supplierRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Close on Escape + lock background scroll while open. `closeOnEscape` is
  // turned off while the party drawer is stacked on top, so Escape there only
  // closes that drawer — not this one underneath.
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

  const set = (patch) => setFormState((f) => ({ ...f, ...patch }));

  // Supplier is the only required field; validate before handing off to save.
  function handleSubmit(e) {
    e.preventDefault();
    if (!formState.supplier.trim()) {
      set({ error: "Supplier is required." });
      supplierRef.current?.focus();
      return;
    }
    set({ error: "" });
    onSubmit(e);
  }

  const error = formState.error;

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
        aria-label={mode === "add" ? "Add Raw Material Sheet" : "Edit Raw Material Sheet"}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {mode === "add" ? "Add Raw Material Sheet" : "Edit Raw Material Sheet"}
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
          <div className="space-y-4">
            {/* Supplier — searchable dropdown (not wrapped in <label> so clicking
                a dropdown option doesn't re-focus the input). */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Supplier<span className="ml-0.5 text-rose-500">*</span>
              </span>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    inputRef={supplierRef}
                    value={formState.supplier}
                    onChange={(val) => {
                      set({ supplier: val });
                      if (error) set({ error: "" });
                    }}
                    options={supplierOptions}
                    placeholder="Search or select a supplier"
                    invalid={!!error}
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
              {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
            </div>

            <Field label="Date">
              <input
                type="date"
                value={formState.date}
                onChange={(e) => set({ date: e.target.value })}
                className={FIELD_CLASS}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Size">
                <input
                  value={formState.size}
                  onChange={(e) => set({ size: e.target.value })}
                  placeholder="e.g. 100"
                  className={FIELD_CLASS}
                />
              </Field>
              <Field label="Point">
                <input
                  value={formState.point}
                  onChange={(e) => set({ point: e.target.value })}
                  placeholder="e.g. 120p"
                  className={FIELD_CLASS}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Grade">
                <input
                  value={formState.grade}
                  onChange={(e) => set({ grade: e.target.value })}
                  placeholder="e.g. M5"
                  className={FIELD_CLASS}
                />
              </Field>
              <Field label="Quantity">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={formState.quantity}
                  onChange={(e) => set({ quantity: e.target.value })}
                  placeholder="e.g. 100"
                  className={FIELD_CLASS}
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
            {mode === "add" ? <Plus size={16} strokeWidth={2.5} /> : <Check size={16} strokeWidth={2.5} />}
            {saving
              ? mode === "add"
                ? "Adding…"
                : "Updating…"
              : mode === "add"
                ? "Add Sheet"
                : "Update Sheet"}
          </button>
        </div>
      </div>
    </div>
  );
}
