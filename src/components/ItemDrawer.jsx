import { useEffect, useRef } from "react";
import { X, Plus, Trash2, Check } from "lucide-react";

const BASE_FIELD =
  "w-full rounded-md border px-3 py-2.5 text-sm text-slate-700 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-1";

const REQUIRED = [
  "sheetId",
  "sheetQty",
  "productSize",
  "productCount",
  "productQty",
];

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
 * ItemDrawer
 * Right-side slide-in panel to cut products from a raw-material sheet, with a
 * dynamic list of byproducts. Form state lives in the parent.
 */
export default function ItemDrawer({
  open,
  mode,
  formState,
  setFormState,
  sheets = [],
  onClose,
  onSubmit,
}) {
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => firstRef.current?.focus());
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

  const errs = formState.errorFields || [];
  const fieldClass = (name) =>
    `${BASE_FIELD} ${
      errs.includes(name)
        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-300"
        : "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30"
    }`;
  // Byproduct inputs live in a flex row, so no `w-full` (it fights `flex-1`).
  const rowField =
    "rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700 " +
    "placeholder:text-slate-400 focus:outline-none focus:ring-1 " +
    "focus:border-[#1E4D96] focus:ring-[#1E4D96]/30";

  const update = (name, value) =>
    setFormState((f) => ({
      ...f,
      [name]: value,
      error: "",
      errorFields: (f.errorFields || []).filter((x) => x !== name),
    }));
  const updateByproduct = (i, patch) =>
    setFormState((f) => ({
      ...f,
      byproducts: f.byproducts.map((b, idx) =>
        idx === i ? { ...b, ...patch } : b,
      ),
    }));
  const addByproduct = () =>
    setFormState((f) => ({
      ...f,
      byproducts: [...f.byproducts, { name: "", qty: "" }],
    }));
  const removeByproduct = (i) =>
    setFormState((f) => ({
      ...f,
      byproducts: f.byproducts.filter((_, idx) => idx !== i),
    }));

  function handleSubmit(e) {
    e.preventDefault();
    const missing = REQUIRED.filter((k) => !String(formState[k] ?? "").trim());
    if (missing.length) {
      setFormState((f) => ({
        ...f,
        errorFields: missing,
        error: "Please fill the required fields.",
      }));
      firstRef.current?.focus();
      return;
    }
    setFormState((f) => ({ ...f, error: "", errorFields: [] }));
    onSubmit(e);
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
        aria-label={mode === "add" ? "Add Product" : "Edit Product"}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {mode === "add" ? "Add Product" : "Edit Product"}
            </h3>
            <p className="text-xs text-slate-400">Cut products from a sheet</p>
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

        {/* Body */}
        <form
          id="item-form"
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
            <Field label="Select Sheet" required>
              <select
                ref={firstRef}
                value={formState.sheetId}
                onChange={(e) => update("sheetId", e.target.value)}
                className={`${fieldClass("sheetId")} ${formState.sheetId ? "text-slate-700" : "text-slate-400"}`}
              >
                <option value="">-- Select Sheet --</option>
                {sheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Sheet Qty" required>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={formState.sheetQty}
                  onChange={(e) => update("sheetQty", e.target.value)}
                  placeholder="e.g. 5"
                  className={fieldClass("sheetQty")}
                />
              </Field>
              <Field label="Product Size" required>
                <input
                  value={formState.productSize}
                  onChange={(e) => update("productSize", e.target.value)}
                  placeholder="e.g. 10"
                  className={fieldClass("productSize")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="How Many Products" required>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={formState.productCount}
                  onChange={(e) => update("productCount", e.target.value)}
                  placeholder="e.g. 40"
                  className={fieldClass("productCount")}
                />
              </Field>
              <Field label="Product Qty" required>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={formState.productQty}
                  onChange={(e) => update("productQty", e.target.value)}
                  placeholder="e.g. 200"
                  className={fieldClass("productQty")}
                />
              </Field>
            </div>

            {/* Byproducts */}
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">
                Byproducts{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </p>
              <div className="space-y-2">
                {formState.byproducts.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={b.name}
                      onChange={(e) =>
                        updateByproduct(i, { name: e.target.value })
                      }
                      placeholder="Byproduct name"
                      className={`${rowField} min-w-0 flex-1`}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={b.qty}
                      onChange={(e) => updateByproduct(i, { qty: e.target.value })}
                      placeholder="Qty"
                      className={`${rowField} w-24 shrink-0`}
                    />
                    <button
                      type="button"
                      onClick={() => removeByproduct(i)}
                      disabled={formState.byproducts.length === 1}
                      aria-label="Remove byproduct"
                      className="p-2 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addByproduct}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1E4D96] hover:underline"
              >
                <Plus size={13} strokeWidth={2.5} /> Add Another Byproduct
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
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
            form="item-form"
            className="inline-flex items-center gap-2 rounded-md bg-[#1E4D96] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
          >
            {mode === "add" ? (
              <Plus size={16} strokeWidth={2.5} />
            ) : (
              <Check size={16} strokeWidth={2.5} />
            )}
            {mode === "add" ? "Add Product" : "Update Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
