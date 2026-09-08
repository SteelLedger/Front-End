import { useEffect, useRef } from "react";
import { X, Trash2, Check } from "lucide-react";
import InfoTip from "./InfoTip";
import { joinWithAnd, sentenceCase } from "../utils/text";
import { gmToKg } from "../utils/units";
import { BYPRODUCT_OPTIONS } from "../utils/byproducts";

/** A computed kg figure, trimmed the same way gmToKgDisplay trims. */
const kgDisplay = (kg) => Number(kg.toFixed(3)).toLocaleString("en-IN");

const FIELD =
  "w-full rounded-md border px-3 py-2.5 text-sm text-slate-700 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-1";
const ROW_FIELD =
  "rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-1 " +
  "focus:border-[#1E4D96] focus:ring-[#1E4D96]/30";

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

/**
 * ProductionDrawer
 * "Cut product from a sheet" form -> POST /productions. All weight inputs are in
 * kg; the parent converts to grams. Byproduct name is a dropdown (with "Other"
 * revealing a text field).
 */
export default function ProductionDrawer({
  open,
  mode,
  formState,
  setFormState,
  sheets = [],
  // { sheetId, gm } on an edit: what this run already took out of that sheet.
  sheetCredit = null,
  saving,
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

  const set = (patch) => setFormState((f) => ({ ...f, ...patch }));
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
      byproducts: [...f.byproducts, { name: "", customName: "", qty: "" }],
    }));
  const removeByproduct = (i) =>
    setFormState((f) => ({
      ...f,
      byproducts: f.byproducts.filter((_, idx) => idx !== i),
    }));

  // ── Derived values ──────────────────────────────────────────────────────
  const selectedSheet =
    sheets.find((s) => s.id === formState.rawMaterialId) || null;
  const sheetKg = selectedSheet ? gmToKg(selectedSheet.totalQtyGm) : 0;

  // On an edit the sheet's stock already has this run deducted, so re-saving
  // it unchanged would read as overdrawing the sheet. Add its own consumption
  // back to get what this run actually has to work with — but only while it is
  // still cutting the sheet it was saved against.
  const creditKg =
    sheetCredit && selectedSheet?.id === sheetCredit.sheetId
      ? gmToKg(sheetCredit.gm)
      : 0;
  const availableKg = sheetKg + creditKg;

  const maxSize =
    selectedSheet &&
    selectedSheet.size !== "" &&
    !Number.isNaN(Number(selectedSheet.size))
      ? Number(selectedSheet.size) + 1
      : null;
  const sizeNum = Number(formState.productSize);
  const sizeInvalid =
    formState.productSize !== "" &&
    maxSize != null &&
    (Number.isNaN(sizeNum) || sizeNum > maxSize);

  const sumByproductKg = (formState.byproducts || []).reduce(
    (s, b) => s + (Number(b.qty) || 0),
    0,
  );
  // Everything that leaves the sheet: product, byproducts, balance patta
  // (which returns to raw-material stock at a new size) and waste.
  const usedKg =
    (Number(formState.howMany) || 0) +
    sumByproductKg +
    (Number(formState.balancePattaQty) || 0) +
    (Number(formState.wasteQty) || 0);
  const remainingKg = availableKg - usedKg;

  // A run can produce a product, byproducts, or both. Mirrors the API:
  // productSize and productQty are optional but go together, and when neither
  // is given at least one byproduct is required.
  //
  // "Entered" here means typed into at all — a 0 counts as entered, so the
  // pairing rules and the greater-than-zero rules stay separate complaints
  // rather than a blank field and a 0 both reading as "missing".
  const sizeEntered = String(formState.productSize).trim() !== "";
  const qtyEntered = String(formState.howMany).trim() !== "";
  const productHalfDone = sizeEntered !== qtyEntered;

  // Balance patta size and quantity likewise go together.
  const balanceSizeEntered = String(formState.balancePattaSize).trim() !== "";
  const balanceQtyEntered = String(formState.balancePattaQty).trim() !== "";
  const balanceHalfDone = balanceSizeEntered !== balanceQtyEntered;

  // Sizes and weights are amounts: filled in, they have to be above zero.
  const notPositive = (v) => String(v).trim() !== "" && !(Number(v) > 0);
  const sizeNotPositive = notPositive(formState.productSize);
  const qtyNotPositive = notPositive(formState.howMany);
  const balanceSizeNotPositive = notPositive(formState.balancePattaSize);
  const balanceQtyNotPositive = notPositive(formState.balancePattaQty);
  // Named in the order the fields appear, so the banner calls out only what
  // the user actually got wrong rather than reciting all four.
  const notPositiveNames = [
    sizeNotPositive && "product size",
    qtyNotPositive && "product quantity",
    balanceSizeNotPositive && "balance patta size",
    balanceQtyNotPositive && "balance patta quantity",
  ].filter(Boolean);
  const amountsNotPositive = notPositiveNames.length > 0;

  // Size and quantity go together; bundles is optional on its own.
  const hasProduct =
    sizeEntered && qtyEntered && !sizeNotPositive && !qtyNotPositive;

  // The backend names the balance-patta row from this size plus the source
  // sheet's point and grade — show it so a typo is visible before saving.
  const balancePattaName =
    balanceSizeEntered && selectedSheet
      ? `${String(formState.balancePattaSize).trim()}X${selectedSheet.point ?? ""} ${selectedSheet.grade ?? ""}`
          .trim()
          .toUpperCase()
      : "";
  const hasByproduct = (formState.byproducts || []).some(
    (b) =>
      (b.name === "Other" ? (b.customName || "").trim() : b.name) &&
      Number(b.qty) > 0,
  );

  const canSubmit =
    !!formState.rawMaterialId &&
    !!formState.productionDate &&
    !sizeInvalid &&
    !amountsNotPositive &&
    !productHalfDone &&
    !balanceHalfDone &&
    (hasProduct || hasByproduct);

  // Why the submit button is off — a silently disabled button is a dead end.
  const blockedReason = !formState.rawMaterialId
    ? "Select a sheet to cut from."
    : amountsNotPositive
      ? `${sentenceCase(joinWithAnd(notPositiveNames))} must be greater than 0.`
      : productHalfDone
        ? "Product size and quantity go together — fill both, or clear both to record byproducts only."
        : balanceHalfDone
          ? "Balance patta needs both a size and a quantity."
          : !hasProduct && !hasByproduct
            ? "Add a product, or at least one byproduct."
            : "";

  // Shown in the footer, but only once a typed value is actually wrong — an
  // untouched form shouldn't open scolding the user for the fields it needs.
  const showBlockedReason =
    amountsNotPositive || sizeInvalid || productHalfDone || balanceHalfDone;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(e);
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

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
            className="-m-2 rounded-md p-2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form
          id="production-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {/* Select sheet + weight */}
          <div>
            <Field label="Select Sheet" required>
              <select
                ref={firstRef}
                value={formState.rawMaterialId}
                onChange={(e) => set({ rawMaterialId: e.target.value })}
                className={`${FIELD} border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30 ${formState.rawMaterialId ? "text-slate-700" : "text-slate-400"}`}
              >
                <option value="">-- Select Sheet --</option>
                {sheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            {selectedSheet && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                <span className="font-medium text-slate-600">
                  Sheet Weight:
                </span>
                <span className="font-semibold text-slate-800">
                  {kgDisplay(availableKg)} kg
                </span>
                <InfoTip
                  text={
                    creditKg > 0
                      ? `In kg. Includes the ${kgDisplay(creditKg)} kg this run currently uses, which is freed up when you save it again.`
                      : "This value is in kg."
                  }
                />
              </div>
            )}
          </div>

          {/* Product size */}
          <div>
            <Field
              label="Product Size"
              info="Leave the product fields blank to record a byproduct-only run."
            >
              <input
                value={formState.productSize}
                onChange={(e) => set({ productSize: e.target.value })}
                placeholder={maxSize != null ? `Max ${maxSize}` : "e.g. 101"}
                className={`${FIELD} ${
                  sizeInvalid ||
                  sizeNotPositive ||
                  (productHalfDone && !sizeEntered)
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-300"
                    : "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30"
                }`}
              />
            </Field>
            {sizeNotPositive ? (
              <p className="mt-1 text-xs text-rose-600">
                Product size must be greater than 0.
              </p>
            ) : sizeInvalid ? (
              <p className="mt-1 text-xs text-rose-600">
                Product size can be at most {maxSize} for this sheet.
              </p>
            ) : (
              selectedSheet && (
                <p className="mt-1 text-xs text-slate-400">
                  Sheet size {selectedSheet.size} — product size up to {maxSize}
                  .
                </p>
              )
            )}
          </div>

          {/* Product quantity + bundles */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Products (In kg)">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={formState.howMany}
                onChange={(e) => set({ howMany: e.target.value })}
                placeholder="kg"
                className={`${FIELD} ${
                  qtyNotPositive || (productHalfDone && !qtyEntered)
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-300"
                    : "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30"
                }`}
              />
            </Field>
            <Field
              label="Product Bundles"
              info="How many bundles this run produced. A count, not a weight — optional, and recorded on the production only."
            >
              <input
                inputMode="numeric"
                value={formState.productBundles}
                onChange={(e) =>
                  set({ productBundles: e.target.value.replace(/[^0-9]/g, "") })
                }
                placeholder="e.g. 10"
                className={`${FIELD} border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30`}
              />
            </Field>
          </div>

          {/* Waste + date */}
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Waste (In kg)"
              info="Scrap that is lost. Deducted from the sheet and not added to any stock — unlike balance patta, which goes back into raw material."
            >
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={formState.wasteQty}
                onChange={(e) => set({ wasteQty: e.target.value })}
                placeholder="kg"
                className={`${FIELD} border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30`}
              />
            </Field>
            <Field label="Production Date" required>
              <input
                type="date"
                value={formState.productionDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => set({ productionDate: e.target.value })}
                className={`${FIELD} border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30`}
              />
            </Field>
          </div>

          {/* Balance patta — the usable offcut that goes back to raw material */}
          <div>
            <p className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-800">
              Balance Patta{" "}
              <span className="font-normal text-slate-400">(optional)</span>
              <InfoTip text="Sheet left over at a smaller size. It returns to raw-material stock under this size plus the source sheet's point and grade — so it can be cut again later." />
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Balance Patta Size">
                <input
                  value={formState.balancePattaSize}
                  onChange={(e) =>
                    set({
                      balancePattaSize: e.target.value.replace(
                        /[^a-zA-Z0-9]/g,
                        "",
                      ),
                    })
                  }
                  placeholder="e.g. 8"
                  className={`${FIELD} ${
                    balanceSizeNotPositive ||
                    (balanceHalfDone && !balanceSizeEntered)
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-300"
                      : "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30"
                  }`}
                />
              </Field>
              <Field label="Balance Patta (In kg)">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={formState.balancePattaQty}
                  onChange={(e) => set({ balancePattaQty: e.target.value })}
                  placeholder="kg"
                  className={`${FIELD} ${
                    balanceQtyNotPositive ||
                    (balanceHalfDone && !balanceQtyEntered)
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-300"
                      : "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30"
                  }`}
                />
              </Field>
            </div>
            {(balanceSizeNotPositive || balanceQtyNotPositive) && (
              <p className="mt-1.5 text-xs text-rose-600">
                {sentenceCase(
                  joinWithAnd([
                    balanceSizeNotPositive && "size",
                    balanceQtyNotPositive && "quantity",
                  ]),
                )}{" "}
                must be greater than 0.
              </p>
            )}
            {balancePattaName && (
              <p className="mt-1.5 text-xs text-slate-400">
                Goes to raw material:{" "}
                <span className="font-medium text-slate-500">
                  {balancePattaName}
                </span>
              </p>
            )}
          </div>

          {/* Byproducts */}
          <div>
            <p className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-800">
              Byproducts{" "}
              <span className="font-normal text-slate-400">(optional)</span>
              <InfoTip text="Enter each byproduct quantity in kg." />
            </p>
            <div className="space-y-2">
              {formState.byproducts.map((b, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-lg border border-slate-200 p-2"
                >
                  <div className="flex items-center gap-2">
                    <select
                      value={b.name}
                      onChange={(e) =>
                        updateByproduct(i, { name: e.target.value })
                      }
                      className={`${ROW_FIELD} min-w-0 flex-1 ${b.name ? "text-slate-700" : "text-slate-400"}`}
                    >
                      <option value="">Byproduct name</option>
                      {BYPRODUCT_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={b.qty}
                      onChange={(e) =>
                        updateByproduct(i, { qty: e.target.value })
                      }
                      placeholder="Qty (kg)"
                      className={`${ROW_FIELD} w-24 shrink-0`}
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
                  {b.name === "Other" && (
                    <input
                      value={b.customName}
                      onChange={(e) =>
                        updateByproduct(i, { customName: e.target.value })
                      }
                      placeholder="Enter byproduct name"
                      className={`${ROW_FIELD} w-full`}
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addByproduct}
              className="-ml-2 mt-1.5 inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs font-semibold text-[#1E4D96] hover:underline"
            >
              Add Another Byproduct
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-slate-200">
          {showBlockedReason && blockedReason && (
            <p className="mx-6 mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {blockedReason}
            </p>
          )}
          {/* Sits here rather than mid-form so it stays visible while the
              fields above it scroll — it's the number you check before saving. */}
          {selectedSheet && (
            <div className="mx-6 mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs font-medium text-slate-500">
                Remaining sheet weight
              </span>
              <span
                className={`text-sm font-semibold ${
                  remainingKg < 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {kgDisplay(remainingKg)} kg
              </span>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="production-form"
              disabled={saving || !canSubmit}
              title={blockedReason || undefined}
              className="inline-flex items-center gap-2 rounded-md bg-[#1E4D96] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
            >
              {mode !== "add" && <Check size={16} strokeWidth={2.5} />}
              {saving
                ? mode === "add"
                  ? "Adding…"
                  : "Updating…"
                : mode === "add"
                  ? "Add Product"
                  : "Update Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
