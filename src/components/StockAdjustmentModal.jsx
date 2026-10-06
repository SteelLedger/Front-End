import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { X, SlidersHorizontal, Check, Loader2, Plus, Minus } from "lucide-react";
import { gmToKgDisplay } from "../utils/units";
import { decimalInput } from "../utils/text";
import {
  DETAILS_MAX,
  DIRECTIONS,
  buildAdjustmentPayload,
  emptyAdjustmentForm,
  resultingQtyGm,
  validateAdjustment,
} from "../utils/stockAdjustment";

/**
 * StockAdjustmentModal
 * Manual stock correction for one inventory row — raw material or product.
 * Both sides post the same body, so the caller only supplies `onSave`, which
 * picks the endpoint (adjustRawMaterialStock / adjustProductStock).
 *
 * The wrapper mounts the dialog only while open, so the form starts clean each
 * time without an effect resetting it.
 */
export default function StockAdjustmentModal({
  open,
  itemName,
  currentQtyGm = 0,
  onSave,
  onSaved,
  onClose,
}) {
  if (!open) return null;
  return (
    <AdjustmentDialog
      itemName={itemName}
      currentQtyGm={currentQtyGm}
      onSave={onSave}
      onSaved={onSaved}
      onClose={onClose}
    />
  );
}

function AdjustmentDialog({
  itemName,
  currentQtyGm,
  onSave,
  onSaved,
  onClose,
}) {
  const [form, setForm] = useState(emptyAdjustmentForm);
  const [saving, setSaving] = useState(false);
  const qtyRef = useRef(null);

  // Focus the quantity field — direction and date both open on a sane default,
  // so the amount is the first thing actually needing input.
  useEffect(() => {
    const id = setTimeout(() => qtyRef.current?.focus(), 50);
    function onKey(e) {
      if (e.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(id);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, saving]);

  const update = (field, value) =>
    setForm((f) => ({ ...f, [field]: value, error: "", errorFields: [] }));

  const reducing = form.direction === "reduce";
  const errs = form.errorFields || [];

  const fieldClass = (name) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
      errs.includes(name)
        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-300"
        : "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30"
    }`;

  // Only worth previewing once there's an amount to preview.
  const typedQty = Number(form.quantity) > 0;
  const resultGm = resultingQtyGm(form, currentQtyGm);

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validateAdjustment(form, currentQtyGm);
    if (problem) {
      setForm((f) => ({
        ...f,
        error: problem.message,
        errorFields: [problem.field],
      }));
      return;
    }

    setSaving(true);
    try {
      await onSave(buildAdjustmentPayload(form));
      toast.success(
        reducing
          ? `Reduced ${form.quantity} kg from ${itemName}`
          : `Added ${form.quantity} kg to ${itemName}`,
      );
      onSaved?.();
      onClose();
    } catch (err) {
      // 400 covers "insufficient stock" and any validation the client missed;
      // the API's wording beats anything generic here.
      const message =
        err?.response?.data?.message || "Couldn't adjust this stock.";
      setForm((f) => ({ ...f, error: message, errorFields: [] }));
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={saving ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Stock adjustment"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E4D96]">
              <SlidersHorizontal size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">
                Stock Adjustment
              </h3>
              <p className="truncate text-xs text-slate-400">
                {itemName || "—"} · {gmToKgDisplay(currentQtyGm)} kg on hand
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="-m-2 rounded-md p-2 text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {form.error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                {form.error}
              </p>
            )}

            {/*
              Direction. A segmented pair rather than a switch: which way the
              stock is moving is the one thing here that must not be misread,
              and each side says its own name.
            */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Direction<span className="ml-0.5 text-rose-500">*</span>
              </span>
              <div
                role="radiogroup"
                aria-label="Adjustment direction"
                className="grid grid-cols-2 gap-2"
              >
                {DIRECTIONS.map(({ value, label }) => {
                  const active = form.direction === value;
                  const isReduce = value === "reduce";
                  const Icon = isReduce ? Minus : Plus;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => update("direction", value)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40 ${
                        active
                          ? isReduce
                            ? "border-rose-500 bg-rose-50 text-rose-700"
                            : "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={15} strokeWidth={2.5} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Adjustment Date<span className="ml-0.5 text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  value={form.date}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => update("date", e.target.value)}
                  className={fieldClass("date")}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Total Qty (kg)<span className="ml-0.5 text-rose-500">*</span>
                </span>
                <input
                  ref={qtyRef}
                  inputMode="decimal"
                  value={form.quantity}
                  onChange={(e) =>
                    update("quantity", decimalInput(e.target.value))
                  }
                  placeholder="100"
                  className={fieldClass("quantity")}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                <span>
                  Details<span className="ml-0.5 text-rose-500">*</span>
                </span>
                <span className="font-normal text-slate-400">
                  {form.details.length}/{DETAILS_MAX}
                </span>
              </span>
              <textarea
                rows={3}
                value={form.details}
                maxLength={DETAILS_MAX}
                onChange={(e) => update("details", e.target.value)}
                placeholder="e.g. Physical count correction after audit"
                className={`${fieldClass("details")} resize-none`}
              />
            </label>

            {/* What this will leave on hand — the point of the whole form. */}
            {typedQty && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
                <span>
                  {gmToKgDisplay(currentQtyGm)} kg
                  <span className="mx-1.5 text-slate-400">
                    {reducing ? "−" : "+"}
                  </span>
                  {form.quantity} kg
                </span>
                <span>
                  New stock on hand:{" "}
                  <span
                    className={`font-semibold ${
                      resultGm < 0 ? "text-rose-600" : "text-slate-800"
                    }`}
                  >
                    {gmToKgDisplay(Math.max(0, resultGm))} kg
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1E4D96] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A] disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} strokeWidth={2.5} />
              )}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
