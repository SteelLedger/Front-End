import { useEffect, useRef } from "react";
import { X, Trash2, Check, Plus } from "lucide-react";
import InfoTip from "./InfoTip";
import { joinWithAnd, sentenceCase, decimalInput } from "../utils/text";
import { gmToKg } from "../utils/units";
import { BYPRODUCT_OPTIONS } from "../utils/byproducts";
import { PRODUCTION_TYPES } from "../utils/production";
import { useFocusTrap, useEnterAdvance } from "../utils/keyboard";

/** A computed kg figure, trimmed the same way gmToKgDisplay trims. */
const kgDisplay = (kg) => Number(kg.toFixed(3)).toLocaleString("en-IN");

const FIELD =
  "w-full rounded-md border px-3 py-2.5 text-sm text-slate-700 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-1";
const ROW_FIELD =
  "rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-1 " +
  "focus:border-[#1E4D96] focus:ring-[#1E4D96]/30";

const OK_BORDER =
  "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30";
const BAD_BORDER = "border-rose-400 focus:border-rose-500 focus:ring-rose-300";

/** A titled group of fields. */
function Section({ title, optional, info, children }) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="flex items-center gap-1 text-sm font-semibold text-slate-800">
        {title}
        {optional && (
          <span className="font-normal text-slate-400">(optional)</span>
        )}
        {info && <InfoTip text={info} />}
      </h4>
      {children}
    </section>
  );
}

/** The "+ Add …" button under a repeatable list. */
function AddRowButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[#1E4D96]/40 px-3 py-2 text-xs font-semibold text-[#1E4D96] transition-colors hover:border-[#1E4D96] hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40"
    >
      <Plus size={14} strokeWidth={2.5} />
      {children}
    </button>
  );
}

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
  const panelRef = useRef(null);
  // Tab stays in the drawer; Enter walks to the next field.
  useFocusTrap(panelRef, open);
  const onPanelKeyDown = useEnterAdvance(panelRef);
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
  const updateBalance = (i, patch) =>
    setFormState((f) => ({
      ...f,
      balancePattas: f.balancePattas.map((b, idx) =>
        idx === i ? { ...b, ...patch } : b,
      ),
    }));
  const addBalance = () =>
    setFormState((f) => ({
      ...f,
      balancePattas: [...f.balancePattas, { size: "", qty: "" }],
    }));
  // Removing the only row just clears it, so there's always a row to type in.
  const removeBalance = (i) =>
    setFormState((f) => ({
      ...f,
      balancePattas:
        f.balancePattas.length === 1
          ? [{ size: "", qty: "" }]
          : f.balancePattas.filter((_, idx) => idx !== i),
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
  const balancePattas = formState.balancePattas || [];
  const sumBalanceKg = balancePattas.reduce(
    (s, b) => s + (Number(b.qty) || 0),
    0,
  );
  // Everything that leaves the sheet: product, byproducts, balance patta
  // (which returns to raw-material stock at a new size) and waste.
  const usedKg =
    (Number(formState.howMany) || 0) +
    sumByproductKg +
    sumBalanceKg +
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

  // Sizes and weights are amounts: filled in, they have to be above zero.
  const entered = (v) => String(v ?? "").trim() !== "";
  const notPositive = (v) => entered(v) && !(Number(v) > 0);
  const sizeNotPositive = notPositive(formState.productSize);
  const qtyNotPositive = notPositive(formState.howMany);

  // Each balance patta's size and quantity likewise go together. The backend
  // names its raw-material row from the size plus the source sheet's point and
  // grade — shown per row so a typo is visible before saving.
  //
  // Sizes must be unique across the run: two offcuts at one size are one
  // raw-material row, and the API rejects the repeat. Compared as numbers so
  // "8" and "8.0" count as the same size.
  const sizeCounts = balancePattas.reduce((m, b) => {
    if (entered(b.size) && Number(b.size) > 0) {
      const k = Number(b.size);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, new Map());
  const balanceRows = balancePattas.map((b) => {
    const sizeIn = entered(b.size);
    const qtyIn = entered(b.qty);
    return {
      sizeIn,
      qtyIn,
      halfDone: sizeIn !== qtyIn,
      duplicate: sizeIn && sizeCounts.get(Number(b.size)) > 1,
      sizeBad: notPositive(b.size),
      qtyBad: notPositive(b.qty),
      name:
        sizeIn && selectedSheet
          ? `${String(b.size).trim()}X${selectedSheet.point ?? ""} ${selectedSheet.grade ?? ""}`
              .trim()
              .toUpperCase()
          : "",
    };
  });
  const balanceHalfDone = balanceRows.some((r) => r.halfDone);
  const balanceSizeNotPositive = balanceRows.some((r) => r.sizeBad);
  const balanceQtyNotPositive = balanceRows.some((r) => r.qtyBad);
  const balanceDuplicate = balanceRows.some((r) => r.duplicate);
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

  const hasByproduct = (formState.byproducts || []).some(
    (b) =>
      (b.name === "Other" ? (b.customName || "").trim() : b.name) &&
      Number(b.qty) > 0,
  );

  const canSubmit =
    !!formState.rawMaterialId &&
    !!formState.productionType &&
    !!formState.productionDate &&
    !sizeInvalid &&
    !amountsNotPositive &&
    !productHalfDone &&
    !balanceHalfDone &&
    !balanceDuplicate &&
    (hasProduct || hasByproduct);

  // Why the submit button is off — a silently disabled button is a dead end.
  const blockedReason = !formState.rawMaterialId
    ? "Select a sheet to cut from."
    : !formState.productionType
      ? "Choose the production type for this run."
      : amountsNotPositive
        ? `${sentenceCase(joinWithAnd(notPositiveNames))} must be greater than 0.`
        : productHalfDone
          ? "Product size and quantity go together — fill both, or clear both to record byproducts only."
          : balanceHalfDone
            ? "Each balance patta needs both a size and a quantity."
            : balanceDuplicate
              ? "Each balance patta size can only be used once — merge the repeated rows."
              : !hasProduct && !hasByproduct
                ? "Add a product, or at least one byproduct."
                : "";

  // Shown in the footer, but only once a typed value is actually wrong — an
  // untouched form shouldn't open scolding the user for the fields it needs.
  const showBlockedReason =
    amountsNotPositive ||
    sizeInvalid ||
    productHalfDone ||
    balanceHalfDone ||
    balanceDuplicate;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(e);
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
      /* Closed but still mounted — without this its fields stay in the page's
         tab order and Tab walks through an invisible form. */
      inert={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={panelRef}
        onKeyDown={onPanelKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "add" ? "Add Product" : "Edit Product"}
        className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
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
          className="flex-1 overflow-y-auto bg-slate-50/60 px-6 py-5 space-y-4"
        >
          {/* The sheet and how the run was cut */}
          <Section title="Sheet">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Field label="Select Sheet" required>
                  <select
                    ref={firstRef}
                    value={formState.rawMaterialId}
                    onChange={(e) => set({ rawMaterialId: e.target.value })}
                    className={`${FIELD} ${OK_BORDER} ${formState.rawMaterialId ? "text-slate-700" : "text-slate-400"}`}
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

              {/* Recorded on the production only */}
              <Field
                label="Production Type"
                required
                info="How many lines this run was cut on. Recorded on the production record; it doesn't change any stock figure."
              >
                <select
                  value={formState.productionType}
                  onChange={(e) => set({ productionType: e.target.value })}
                  className={`${FIELD} ${OK_BORDER} ${
                    formState.productionType
                      ? "text-slate-700"
                      : "text-slate-400"
                  }`}
                >
                  <option value="">-- Select Production Type --</option>
                  {PRODUCTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* Product */}
          <Section
            title="Product"
            info="Leave the product fields blank to record a byproduct-only run."
          >
            <div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Product Size">
                  <input
                    value={formState.productSize}
                    inputMode="decimal"
                    onChange={(e) =>
                      set({ productSize: decimalInput(e.target.value) })
                    }
                    placeholder={
                      maxSize != null ? `Max ${maxSize}` : "e.g. 101"
                    }
                    className={`${FIELD} ${
                      sizeInvalid ||
                      sizeNotPositive ||
                      (productHalfDone && !sizeEntered)
                        ? BAD_BORDER
                        : OK_BORDER
                    }`}
                  />
                </Field>
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
                        ? BAD_BORDER
                        : OK_BORDER
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
                      set({
                        productBundles: e.target.value.replace(/[^0-9]/g, ""),
                      })
                    }
                    placeholder="e.g. 10"
                    className={`${FIELD} ${OK_BORDER}`}
                  />
                </Field>
              </div>
              {sizeNotPositive ? (
                <p className="mt-1.5 text-xs text-rose-600">
                  Product size must be greater than 0.
                </p>
              ) : sizeInvalid ? (
                <p className="mt-1.5 text-xs text-rose-600">
                  Product size can be at most {maxSize} for this sheet.
                </p>
              ) : (
                selectedSheet && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Sheet size {selectedSheet.size} — product size up to{" "}
                    {maxSize}.
                  </p>
                )
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                  className={`${FIELD} ${OK_BORDER}`}
                />
              </Field>
              <Field label="Production Date" required>
                <input
                  type="date"
                  value={formState.productionDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => set({ productionDate: e.target.value })}
                  className={`${FIELD} ${OK_BORDER}`}
                />
              </Field>
            </div>
          </Section>

          {/* Balance patta — usable offcuts that go back to raw material */}
          <Section
            title="Balance Patta"
            optional
            info="Sheet left over at a smaller size. Each one returns to raw-material stock under its size plus the source sheet's point and grade, so it can be cut again later. Add a row for every offcut size."
          >
            <div className="space-y-3">
              {balancePattas.map((b, i) => {
                const row = balanceRows[i];
                return (
                  <div key={i}>
                    <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                      <Field
                        label={
                          balancePattas.length > 1
                            ? `Balance Patta Size #${i + 1}`
                            : "Balance Patta Size"
                        }
                      >
                        <input
                          value={b.size}
                          inputMode="decimal"
                          onChange={(e) =>
                            updateBalance(i, {
                              size: decimalInput(e.target.value),
                            })
                          }
                          placeholder="e.g. 8.5"
                          className={`${FIELD} ${
                            row.sizeBad ||
                            row.duplicate ||
                            (row.halfDone && !row.sizeIn)
                              ? BAD_BORDER
                              : OK_BORDER
                          }`}
                        />
                      </Field>
                      <Field label="Balance Patta (In kg)">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={b.qty}
                          onChange={(e) =>
                            updateBalance(i, { qty: e.target.value })
                          }
                          placeholder="kg"
                          className={`${FIELD} ${
                            row.qtyBad || (row.halfDone && !row.qtyIn)
                              ? BAD_BORDER
                              : OK_BORDER
                          }`}
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={() => removeBalance(i)}
                        disabled={
                          balancePattas.length === 1 &&
                          !row.sizeIn &&
                          !row.qtyIn
                        }
                        aria-label={`Remove balance patta ${i + 1}`}
                        title="Remove"
                        className="rounded-md p-2.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {row.sizeBad || row.qtyBad ? (
                      <p className="mt-1.5 text-xs text-rose-600">
                        {sentenceCase(
                          joinWithAnd([
                            row.sizeBad && "size",
                            row.qtyBad && "quantity",
                          ]),
                        )}{" "}
                        must be greater than 0.
                      </p>
                    ) : row.duplicate ? (
                      <p className="mt-1.5 text-xs text-rose-600">
                        Size {String(b.size).trim()} is already used in another
                        row.
                      </p>
                    ) : (
                      row.name && (
                        <p className="mt-1.5 text-xs text-slate-400">
                          Goes to raw material:{" "}
                          <span className="font-medium text-slate-500">
                            {row.name}
                          </span>
                        </p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3">
              <AddRowButton onClick={addBalance}>
                Add Balance Patta
              </AddRowButton>
              {sumBalanceKg > 0 && (
                <span className="text-xs text-slate-500">
                  Total balance patta:{" "}
                  <span className="font-semibold text-slate-700">
                    {kgDisplay(sumBalanceKg)} kg
                  </span>
                </span>
              )}
            </div>
          </Section>

          {/* Byproducts */}
          <Section
            title="Byproducts"
            optional
            info="Enter each byproduct quantity in kg."
          >
            <div className="space-y-3">
              {formState.byproducts.map((b, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-3">
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
                      className={`${ROW_FIELD} w-32 shrink-0`}
                    />
                    <button
                      type="button"
                      onClick={() => removeByproduct(i)}
                      disabled={formState.byproducts.length === 1}
                      aria-label="Remove byproduct"
                      title="Remove"
                      className="rounded-md p-2.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
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
            <AddRowButton onClick={addByproduct}>Add Byproduct</AddRowButton>
          </Section>
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
