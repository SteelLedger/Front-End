import { useEffect, useRef } from "react";
import { X, Plus, Check, Trash2, Layers } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import InfoTip from "./InfoTip";
import { gmToKgDisplay } from "../utils/units";
import {
  emptyLineItem,
  isBlankLine,
  isPartialLine,
  filledLines,
  lineTotals,
  lineLabel,
} from "../utils/purchase";

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

// Bill-level required fields (the line items validate separately).
const REQUIRED = ["supplier", "invoiceNumber", "date"];

// Size / point / grade allow letters and numbers only (no special characters).
const alnum = (v) => v.replace(/[^a-zA-Z0-9]/g, "");
// Bundles is a whole count.
const digits = (v) => v.replace(/[^0-9]/g, "");

const LINE_INPUT =
  "w-full rounded-md border px-2.5 py-2 text-sm text-slate-700 placeholder:text-slate-300 " +
  "focus:outline-none focus:ring-1";

const LINE_GRID = "sm:grid-cols-[1fr_1fr_1fr_1.1fr_1fr_auto]";

/**
 * RawMaterialDrawer
 * Right-side slide-in panel for creating / editing a purchase bill (Patta —
 * raw material). One supplier, invoice number and date at the top, then any
 * number of item lines beneath: size, point, grade, quantity and bundles.
 * That mirrors the API, where a bill carries `lineItems[]`.
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

  const clearErrors = (f) => ({
    ...f,
    error: "",
    errorFields: [],
    errorLines: [],
  });

  // Update a bill-level field and clear any validation error.
  const update = (field, value) =>
    setFormState((f) => clearErrors({ ...f, [field]: value }));

  /* ------------------------------ line items ------------------------------ */

  const lines = formState.lineItems ?? [];

  const updateLine = (index, field, value) =>
    setFormState((f) => {
      const next = (f.lineItems ?? []).map((l, i) =>
        i === index ? { ...l, [field]: value } : l,
      );
      // Typing in the last row hands the user a fresh one, so entering several
      // lines never needs a trip back to the "Add Item" button.
      if (index === next.length - 1 && !isBlankLine(next[index])) {
        next.push(emptyLineItem());
      }
      return clearErrors({ ...f, lineItems: next });
    });

  const addLine = () =>
    setFormState((f) =>
      clearErrors({
        ...f,
        lineItems: [...(f.lineItems ?? []), emptyLineItem()],
      }),
    );

  const removeLine = (index) =>
    setFormState((f) => {
      const next = (f.lineItems ?? []).filter((_, i) => i !== index);
      return clearErrors({
        ...f,
        lineItems: next.length ? next : [emptyLineItem()],
      });
    });

  /* ------------------------------- validation ----------------------------- */

  function fieldMissing(name) {
    if (name === "supplier") return !formState.partyId;
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
        errorLines: [],
        error: supplierUnmatched
          ? "Select a supplier from the list (or add a new one)."
          : "Please fill all required fields.",
      }));
      supplierRef.current?.focus();
      return;
    }

    // Half-filled rows are a mistake, not something to silently drop.
    const partial = lines
      .map((l, i) => (isPartialLine(l) ? i : -1))
      .filter((i) => i >= 0);
    if (partial.length) {
      setFormState((f) => ({
        ...f,
        errorFields: [],
        errorLines: partial,
        error:
          "Every item needs a size, point, grade, quantity and bundle count.",
      }));
      return;
    }

    if (!filledLines(lines).length) {
      setFormState((f) => ({
        ...f,
        errorFields: [],
        errorLines: [0],
        error: "Add at least one item to this bill.",
      }));
      return;
    }

    setFormState((f) => clearErrors(f));
    onSubmit(e);
  }

  const errs = formState.errorFields || [];
  const errLines = formState.errorLines || [];

  const fieldClass = (name) =>
    `w-full rounded-md border px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
      errs.includes(name)
        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-300"
        : "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30"
    }`;

  const lineClass = (index) =>
    `${LINE_INPUT} ${
      errLines.includes(index)
        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-300"
        : "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30"
    }`;

  // Resolve the typed/selected supplier name to a real party id.
  function pickSupplier(val) {
    const match = supplierOptions.find(
      (o) => o.name.trim().toLowerCase() === val.trim().toLowerCase(),
    );
    setFormState((f) =>
      clearErrors({ ...f, supplier: val, partyId: match ? match.id : "" }),
    );
  }

  const totals = lineTotals(lines);
  const filledCount = filledLines(lines).length;

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
        className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
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
            className="-m-2 rounded-md p-2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
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

          {/* Bill details — one supplier, invoice and date across every line */}
          <div className="space-y-4">
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
                    noun="supplier"
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>
          </div>

          {/* Items */}
          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                Items
                <InfoTip text="One bill can cover several sheet specs. Each line has its own size, point, grade, quantity and bundle count. Quantity is in kg." />
              </h4>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-xs font-semibold text-[#1E4D96] transition-colors hover:bg-blue-50"
              >
                <Plus size={14} strokeWidth={2.5} /> Add Item
              </button>
            </div>

            {/* Column headers on wide screens; each field is labelled inline below */}
            <div className={`mb-1.5 hidden gap-2 px-1 sm:grid ${LINE_GRID}`}>
              {["Size", "Point", "Grade", "Quantity (kg)", "Bundles"].map(
                (h) => (
                  <span
                    key={h}
                    className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {h}
                    <span className="text-rose-500">*</span>
                  </span>
                ),
              )}
              <span className="w-8" />
            </div>

            <div className="space-y-2">
              {lines.map((line, i) => {
                const label = lineLabel(line);
                return (
                  <div
                    key={i}
                    className={`rounded-lg p-2 sm:p-0 ${
                      errLines.includes(i)
                        ? "bg-rose-50/50 sm:bg-transparent"
                        : ""
                    }`}
                  >
                    <div
                      className={`grid grid-cols-2 gap-2 sm:items-center ${LINE_GRID}`}
                    >
                      <label className="block sm:contents">
                        <span className="mb-1 block text-[11px] font-semibold text-slate-500 sm:hidden">
                          Size *
                        </span>
                        <input
                          value={line.size}
                          onChange={(e) =>
                            updateLine(i, "size", alnum(e.target.value))
                          }
                          placeholder="10"
                          className={lineClass(i)}
                        />
                      </label>
                      <label className="block sm:contents">
                        <span className="mb-1 block text-[11px] font-semibold text-slate-500 sm:hidden">
                          Point *
                        </span>
                        <input
                          value={line.point}
                          onChange={(e) =>
                            updateLine(i, "point", alnum(e.target.value))
                          }
                          placeholder="120p"
                          className={lineClass(i)}
                        />
                      </label>
                      <label className="block sm:contents">
                        <span className="mb-1 block text-[11px] font-semibold text-slate-500 sm:hidden">
                          Grade *
                        </span>
                        <input
                          value={line.grade}
                          onChange={(e) =>
                            updateLine(i, "grade", alnum(e.target.value))
                          }
                          placeholder="M5"
                          className={lineClass(i)}
                        />
                      </label>
                      <label className="block sm:contents">
                        <span className="mb-1 block text-[11px] font-semibold text-slate-500 sm:hidden">
                          Quantity (kg) *
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(i, "quantity", e.target.value)
                          }
                          placeholder="250"
                          className={lineClass(i)}
                        />
                      </label>
                      <label className="block sm:contents">
                        <span className="mb-1 block text-[11px] font-semibold text-slate-500 sm:hidden">
                          Bundles *
                        </span>
                        <input
                          inputMode="numeric"
                          value={line.bundles}
                          onChange={(e) =>
                            updateLine(i, "bundles", digits(e.target.value))
                          }
                          placeholder="12"
                          className={lineClass(i)}
                        />
                      </label>
                      <div className="col-span-2 flex justify-end sm:col-span-1">
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          disabled={lines.length === 1 && isBlankLine(line)}
                          aria-label={`Remove item ${i + 1}`}
                          title="Remove item"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-300"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {/* Echo the name the backend will generate for this line. */}
                    {label && (
                      <p className="mt-1 px-1 text-[11px] text-slate-400">
                        Raw material:{" "}
                        <span className="font-medium text-slate-500">
                          {label}
                        </span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Running totals — the same figures the saved bill reports back. */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                <Layers size={13} />
                {filledCount} {filledCount === 1 ? "item" : "items"}
              </span>
              <span>
                Total quantity:{" "}
                <span className="font-semibold text-slate-700">
                  {gmToKgDisplay(totals.quantityGm)} kg
                </span>
              </span>
              <span>
                Total bundles:{" "}
                <span className="font-semibold text-slate-700">
                  {totals.bundles}
                </span>
              </span>
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
