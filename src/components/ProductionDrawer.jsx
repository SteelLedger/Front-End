import { useEffect, useRef } from "react";
import { X, Trash2, Check, Plus, ChevronRight } from "lucide-react";
import InfoTip from "./InfoTip";
import { joinWithAnd, sentenceCase, decimalInput } from "../utils/text";
import { gmToKg } from "../utils/units";
import { BYPRODUCT_OPTIONS } from "../utils/byproducts";
import {
  PRODUCTION_TYPES,
  emptyProductionEntry,
  emptyBalancePatta,
  emptyByproduct,
  isBlankEntry,
} from "../utils/production";
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

/* ------------------------------- validation -------------------------------- */

const typed = (v) => String(v ?? "").trim() !== "";
// Sizes and weights are amounts: filled in, they have to be above zero.
const notPositive = (v) => typed(v) && !(Number(v) > 0);
const sumKg = (rows = []) => rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
const byproductName = (b) =>
  b.name === "Other" ? (b.customName || "").trim() : b.name;

/** "9X120P M6" — how the backend names a product or offcut cut from `sheet`. */
const cutName = (size, sheet) =>
  typed(size) && sheet
    ? `${String(size).trim()}X${sheet.point ?? ""} ${sheet.grade ?? ""}`
        .trim()
        .toUpperCase()
    : "";

/**
 * Everything the drawer needs to know about one product entry: which fields to
 * outline, what it takes out of the sheet, and the first thing stopping it
 * from saving (`problem`), mirroring the API's rules for a production.
 *
 * "Entered" means typed into at all — a 0 counts as entered, so the pairing
 * rules and the greater-than-zero rules stay separate complaints rather than a
 * blank field and a 0 both reading as "missing".
 */
function checkEntry(e, { sheet, maxSize }) {
  // productSize and productQty are optional but go together, and when neither
  // is given at least one byproduct is required.
  const sizeEntered = typed(e.productSize);
  const qtyEntered = typed(e.howMany);
  const productHalfDone = sizeEntered !== qtyEntered;
  const sizeNotPositive = notPositive(e.productSize);
  const qtyNotPositive = notPositive(e.howMany);
  const sizeNum = Number(e.productSize);
  const sizeInvalid =
    sizeEntered &&
    maxSize != null &&
    (Number.isNaN(sizeNum) || sizeNum > maxSize);

  // Each balance patta's size and quantity likewise go together, and sizes
  // must be unique within the entry: two offcuts at one size are one
  // raw-material row, and the API rejects the repeat. Compared as numbers so
  // "8" and "8.0" count as the same size.
  const pattas = e.balancePattas || [];
  const sizeCounts = pattas.reduce((m, b) => {
    if (typed(b.size) && Number(b.size) > 0) {
      const k = Number(b.size);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, new Map());
  const balanceRows = pattas.map((b) => {
    const sizeIn = typed(b.size);
    const qtyIn = typed(b.qty);
    return {
      sizeIn,
      qtyIn,
      halfDone: sizeIn !== qtyIn,
      duplicate: sizeIn && sizeCounts.get(Number(b.size)) > 1,
      sizeBad: notPositive(b.size),
      qtyBad: notPositive(b.qty),
      name: cutName(b.size, sheet),
    };
  });
  const balanceHalfDone = balanceRows.some((r) => r.halfDone);
  const balanceDuplicate = balanceRows.some((r) => r.duplicate);

  // Named in the order the fields appear, so the banner calls out only what
  // the user actually got wrong.
  const notPositiveNames = [
    sizeNotPositive && "product size",
    qtyNotPositive && "product quantity",
    balanceRows.some((r) => r.sizeBad) && "balance patta size",
    balanceRows.some((r) => r.qtyBad) && "balance patta quantity",
  ].filter(Boolean);

  const hasProduct =
    sizeEntered && qtyEntered && !sizeNotPositive && !qtyNotPositive;
  const byproducts = e.byproducts || [];
  const byproductCount = byproducts.filter(
    (b) => byproductName(b) && Number(b.qty) > 0,
  ).length;
  const balanceCount = pattas.filter(
    (b) => Number(b.size) > 0 && Number(b.qty) > 0,
  ).length;

  const balanceKg = sumKg(pattas);
  const wasteKg = Number(e.wasteQty) || 0;
  // Everything this entry takes out of the sheet: product, byproducts, balance
  // patta (which returns to raw-material stock at a new size) and waste.
  const usedKg =
    (Number(e.howMany) || 0) + sumKg(byproducts) + balanceKg + wasteKg;

  // Once a card has something to save, a missing sheet or type is the reason
  // it can't be — flag it rather than leave a silently disabled button.
  const started =
    sizeEntered ||
    qtyEntered ||
    typed(e.wasteQty) ||
    byproductCount > 0 ||
    balanceCount > 0;
  const sheetMissing = started && !e.rawMaterialId;
  const typeMissing = started && !e.productionType;

  const problem = !e.rawMaterialId
    ? "Select a sheet to cut from."
    : !e.productionType
      ? "Choose the production type."
      : !e.productionDate
        ? "Pick the production date."
        : notPositiveNames.length
          ? `${sentenceCase(joinWithAnd(notPositiveNames))} must be greater than 0.`
          : sizeInvalid
            ? `Product size can be at most ${maxSize} for this sheet.`
            : productHalfDone
              ? "Product size and quantity go together — fill both, or clear both to record byproducts only."
              : balanceHalfDone
                ? "Each balance patta needs both a size and a quantity."
                : balanceDuplicate
                  ? "Each balance patta size can only be used once — merge the repeated rows."
                  : !hasProduct && !byproductCount
                    ? "Add a product, or at least one byproduct."
                    : "";

  return {
    sizeEntered,
    qtyEntered,
    productHalfDone,
    sizeNotPositive,
    qtyNotPositive,
    sizeInvalid,
    balanceRows,
    balanceKg,
    balanceCount,
    byproductCount,
    usedKg,
    productName:
      sizeEntered && !sizeNotPositive ? cutName(e.productSize, sheet) : "",
    // A balance-patta mistake keeps the extras section open so it can't hide.
    extrasError: balanceRows.some(
      (r) => r.halfDone || r.duplicate || r.sizeBad || r.qtyBad,
    ),
    sheetMissing,
    typeMissing,
    problem,
    // Surfaced in the footer only once something typed is actually wrong — an
    // untouched form shouldn't open scolding the user for the fields it needs.
    showProblem:
      sheetMissing ||
      typeMissing ||
      notPositiveNames.length > 0 ||
      sizeInvalid ||
      productHalfDone ||
      balanceHalfDone ||
      balanceDuplicate,
  };
}

/* ------------------------------ building blocks ----------------------------- */

/** The "+ Add …" button under a repeatable list. */
function AddRowButton({ onClick, className = "", children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border border-dashed border-[#1E4D96]/40 px-3 py-2 text-xs font-semibold text-[#1E4D96] transition-colors hover:border-[#1E4D96] hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40 ${className}`}
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

/** A small heading inside a product card's extras. */
function SubHeading({ title, info }) {
  return (
    <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {title}
      <span className="font-normal normal-case tracking-normal text-slate-400">
        (optional)
      </span>
      {info && <InfoTip text={info} />}
    </p>
  );
}

/** What's hidden behind a collapsed extras toggle, in one line. */
function extrasSummary(c) {
  const parts = [
    c.balanceCount > 0 &&
      `${c.balanceCount} balance patta${c.balanceCount === 1 ? "" : "s"}`,
    c.byproductCount > 0 &&
      `${c.byproductCount} byproduct${c.byproductCount === 1 ? "" : "s"}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "None added";
}

/* -------------------------------- entry card -------------------------------- */

/**
 * One product — a complete production of its own: sheet, type and date, then
 * size, weight, bundles and waste, with its balance patta and byproducts
 * behind a toggle. `onChange` takes a patch, or a function of the entry
 * returning one.
 */
function EntryCard({
  entry,
  index,
  numbered,
  check: c,
  sheets,
  sheet,
  availableKg,
  creditKg,
  maxSize,
  canRemove,
  onChange,
  onRemove,
}) {
  const open = entry.expanded || c.extrasError;
  const title = numbered ? `Product ${index + 1}` : "Product";

  const updateBalance = (i, patch) =>
    onChange((e) => ({
      balancePattas: e.balancePattas.map((b, idx) =>
        idx === i ? { ...b, ...patch } : b,
      ),
    }));
  // Removing the only row just clears it, so there's always a row to type in.
  const removeBalance = (i) =>
    onChange((e) => ({
      balancePattas:
        e.balancePattas.length === 1
          ? [emptyBalancePatta()]
          : e.balancePattas.filter((_, idx) => idx !== i),
    }));
  const updateByproduct = (i, patch) =>
    onChange((e) => ({
      byproducts: e.byproducts.map((b, idx) =>
        idx === i ? { ...b, ...patch } : b,
      ),
    }));
  const removeByproduct = (i) =>
    onChange((e) => ({
      byproducts: e.byproducts.filter((_, idx) => idx !== i),
    }));

  return (
    <section
      data-entry={entry.key}
      className="rounded-xl border border-slate-200 bg-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {numbered && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#1E4D96]">
              {index + 1}
            </span>
          )}
          <h4 className="shrink-0 text-sm font-semibold text-slate-800">
            {title}
          </h4>
          <InfoTip text="Leave the product fields blank to record a byproduct-only run." />
          {c.productName && (
            <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {c.productName}
            </span>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${title.toLowerCase()}`}
            title="Remove product"
            className="-my-1 rounded-md p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="space-y-4 p-4">
        {/* What this run was cut from, how, and when */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Field label="Select Sheet" required>
              <select
                data-entry-first
                value={entry.rawMaterialId}
                onChange={(ev) => onChange({ rawMaterialId: ev.target.value })}
                className={`${FIELD} ${c.sheetMissing ? BAD_BORDER : OK_BORDER} ${entry.rawMaterialId ? "text-slate-700" : "text-slate-400"}`}
              >
                <option value="">-- Select Sheet --</option>
                {/* Out-of-stock sheets are offered too — stock may go
                    negative — but labelled so the pick is deliberate. */}
                {sheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.totalQtyGm > 0 ? "" : " (out of stock)"}
                  </option>
                ))}
              </select>
            </Field>
            {sheet && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                <span className="font-medium text-slate-600">Weight:</span>
                <span
                  className={`font-semibold ${availableKg > 0 ? "text-slate-800" : "text-amber-600"}`}
                >
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
              value={entry.productionType}
              onChange={(ev) => onChange({ productionType: ev.target.value })}
              className={`${FIELD} ${c.typeMissing ? BAD_BORDER : OK_BORDER} ${
                entry.productionType ? "text-slate-700" : "text-slate-400"
              }`}
            >
              <option value="">-- Select Type --</option>
              {PRODUCTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Production Date" required>
            <input
              type="date"
              value={entry.productionDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(ev) => onChange({ productionDate: ev.target.value })}
              className={`${FIELD} ${OK_BORDER}`}
            />
          </Field>
        </div>

        {/* Product size, weight, bundles, waste */}
        <div className="border-t border-dashed border-slate-200 pt-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Product Size">
              <input
                value={entry.productSize}
                inputMode="decimal"
                onChange={(ev) =>
                  onChange({ productSize: decimalInput(ev.target.value) })
                }
                placeholder={maxSize != null ? `Max ${maxSize}` : "e.g. 101"}
                className={`${FIELD} ${
                  c.sizeInvalid ||
                  c.sizeNotPositive ||
                  (c.productHalfDone && !c.sizeEntered)
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
                value={entry.howMany}
                onChange={(ev) => onChange({ howMany: ev.target.value })}
                placeholder="kg"
                className={`${FIELD} ${
                  c.qtyNotPositive || (c.productHalfDone && !c.qtyEntered)
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
                value={entry.productBundles}
                onChange={(ev) =>
                  onChange({
                    productBundles: ev.target.value.replace(/[^0-9]/g, ""),
                  })
                }
                placeholder="e.g. 10"
                className={`${FIELD} ${OK_BORDER}`}
              />
            </Field>
            <Field
              label="Waste (In kg)"
              info="Scrap that is lost. Deducted from the sheet and not added to any stock — unlike balance patta, which goes back into raw material."
            >
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={entry.wasteQty}
                onChange={(ev) => onChange({ wasteQty: ev.target.value })}
                placeholder="kg"
                className={`${FIELD} ${OK_BORDER}`}
              />
            </Field>
          </div>
          {c.sizeNotPositive ? (
            <p className="mt-1.5 text-xs text-rose-600">
              Product size must be greater than 0.
            </p>
          ) : c.sizeInvalid ? (
            <p className="mt-1.5 text-xs text-rose-600">
              Product size can be at most {maxSize} for this sheet.
            </p>
          ) : (
            sheet && (
              <p className="mt-1.5 text-xs text-slate-400">
                Sheet size {sheet.size} — product size up to {maxSize}.
              </p>
            )
          )}
        </div>

        {/* Extras toggle */}
        <div className="rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => onChange({ expanded: !open })}
            aria-expanded={open}
            className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40 ${
              open
                ? "rounded-t-lg border-b border-slate-200 bg-slate-50"
                : "rounded-lg"
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <ChevronRight
                size={14}
                className={`text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}
              />
              Balance patta &amp; byproducts
            </span>
            {!open && (
              <span className="truncate text-xs text-slate-400">
                {extrasSummary(c)}
              </span>
            )}
          </button>

          {open && (
            <div className="space-y-5 p-3">
              {/* Balance patta — usable offcuts that go back to raw material */}
              <div>
                <SubHeading
                  title="Balance Patta"
                  info="Sheet left over at a smaller size. Each one returns to raw-material stock under its size plus the source sheet's point and grade, so it can be cut again later. Add a row for every offcut size."
                />
                <div className="space-y-3">
                  {entry.balancePattas.map((b, i) => {
                    const row = c.balanceRows[i];
                    return (
                      <div key={i}>
                        <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-3">
                          <input
                            value={b.size}
                            inputMode="decimal"
                            aria-label={`Balance patta ${i + 1} size`}
                            onChange={(ev) =>
                              updateBalance(i, {
                                size: decimalInput(ev.target.value),
                              })
                            }
                            placeholder="Size, e.g. 8.5"
                            className={`${FIELD} ${
                              row.sizeBad ||
                              row.duplicate ||
                              (row.halfDone && !row.sizeIn)
                                ? BAD_BORDER
                                : OK_BORDER
                            }`}
                          />
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            value={b.qty}
                            aria-label={`Balance patta ${i + 1} quantity in kg`}
                            onChange={(ev) =>
                              updateBalance(i, { qty: ev.target.value })
                            }
                            placeholder="Qty (kg)"
                            className={`${FIELD} ${
                              row.qtyBad || (row.halfDone && !row.qtyIn)
                                ? BAD_BORDER
                                : OK_BORDER
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => removeBalance(i)}
                            disabled={
                              entry.balancePattas.length === 1 &&
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
                            Size {String(b.size).trim()} is already used in
                            another row.
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
                <div className="mt-3 flex items-center justify-between gap-3">
                  <AddRowButton
                    onClick={() =>
                      onChange((e) => ({
                        balancePattas: [
                          ...e.balancePattas,
                          emptyBalancePatta(),
                        ],
                      }))
                    }
                  >
                    Add Balance Patta
                  </AddRowButton>
                  {c.balanceKg > 0 && (
                    <span className="text-xs text-slate-500">
                      Total:{" "}
                      <span className="font-semibold text-slate-700">
                        {kgDisplay(c.balanceKg)} kg
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Byproducts */}
              <div>
                <SubHeading
                  title="Byproducts"
                  info="Enter each byproduct quantity in kg."
                />
                <div className="space-y-3">
                  {entry.byproducts.map((b, i) => (
                    <div key={i} className="space-y-2">
                      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-3">
                        <select
                          value={b.name}
                          aria-label={`Byproduct ${i + 1} name`}
                          onChange={(ev) =>
                            updateByproduct(i, { name: ev.target.value })
                          }
                          className={`${ROW_FIELD} min-w-0 ${b.name ? "text-slate-700" : "text-slate-400"}`}
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
                          aria-label={`Byproduct ${i + 1} quantity in kg`}
                          onChange={(ev) =>
                            updateByproduct(i, { qty: ev.target.value })
                          }
                          placeholder="Qty (kg)"
                          className={`${ROW_FIELD} min-w-0`}
                        />
                        <button
                          type="button"
                          onClick={() => removeByproduct(i)}
                          disabled={entry.byproducts.length === 1}
                          aria-label={`Remove byproduct ${i + 1}`}
                          title="Remove"
                          className="rounded-md p-2.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {b.name === "Other" && (
                        <input
                          value={b.customName}
                          onChange={(ev) =>
                            updateByproduct(i, { customName: ev.target.value })
                          }
                          placeholder="Enter byproduct name"
                          className={`${ROW_FIELD} w-full`}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <AddRowButton
                  className="mt-3"
                  onClick={() =>
                    onChange((e) => ({
                      byproducts: [...e.byproducts, emptyByproduct()],
                    }))
                  }
                >
                  Add Byproduct
                </AddRowButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- drawer ---------------------------------- */

/**
 * ProductionDrawer
 * "Cut products from a sheet" form. Each product card is a complete production
 * — its own sheet, type and date — saved as its own record (POST /productions
 * takes them as a batch). An edit is a single product, since
 * PUT /productions/:id updates one record. All weight inputs are in kg; the
 * parent converts to grams.
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
  const isAdd = mode === "add";
  const panelRef = useRef(null);
  // Tab stays in the drawer; Enter walks to the next field.
  useFocusTrap(panelRef, open);
  const onPanelKeyDown = useEnterAdvance(panelRef);
  // The card just added, so its first field can take focus once it renders.
  const focusEntryRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() =>
      panelRef.current?.querySelector("[data-entry-first]")?.focus(),
    );
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

  const entries = formState.entries || [];

  useEffect(() => {
    const key = focusEntryRef.current;
    if (!key) return;
    focusEntryRef.current = null;
    const card = panelRef.current?.querySelector(`[data-entry="${key}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    card?.querySelector("[data-entry-first]")?.focus({ preventScroll: true });
  }, [entries.length]);

  const setEntry = (key, patch) =>
    setFormState((f) => ({
      ...f,
      entries: f.entries.map((e) =>
        e.key === key
          ? { ...e, ...(typeof patch === "function" ? patch(e) : patch) }
          : e,
      ),
    }));
  const addEntry = () => {
    const entry = emptyProductionEntry();
    focusEntryRef.current = entry.key;
    setFormState((f) => ({ ...f, entries: [...f.entries, entry] }));
  };
  const removeEntry = (key) =>
    setFormState((f) => ({
      ...f,
      entries: f.entries.filter((e) => e.key !== key),
    }));

  // ── Sheets ──────────────────────────────────────────────────────────────
  // On an edit the sheet's stock already has this run deducted, so re-saving
  // it unchanged would read as overdrawing the sheet. Add its own consumption
  // back to get what this run actually has to work with — but only while it is
  // still cutting the sheet it was saved against.
  const creditFor = (sheet) =>
    sheetCredit && sheet?.id === sheetCredit.sheetId
      ? gmToKg(sheetCredit.gm)
      : 0;
  const availableFor = (sheet) =>
    sheet ? gmToKg(sheet.totalQtyGm) + creditFor(sheet) : 0;
  const maxSizeFor = (sheet) =>
    sheet && sheet.size !== "" && !Number.isNaN(Number(sheet.size))
      ? Number(sheet.size) + 1
      : null;

  // ── Entries ─────────────────────────────────────────────────────────────
  const cards = entries.map((e) => {
    const sheet = sheets.find((s) => s.id === e.rawMaterialId) || null;
    const maxSize = maxSizeFor(sheet);
    return { sheet, maxSize, check: checkEntry(e, { sheet, maxSize }) };
  });
  // Untouched cards are dropped on save — unless every card is untouched,
  // in which case the first one still has to be filled in.
  const allBlank = entries.every(isBlankEntry);
  const saved = entries
    .map((e, i) => ({ i, blank: isBlankEntry(e), check: cards[i].check }))
    .filter((x) => allBlank || !x.blank);
  const savedCount = allBlank ? 0 : saved.length;

  // What's left of each sheet once every card cutting it is saved — two cards
  // on the same sheet both come out of the same stock.
  const sheetUsage = [];
  cards.forEach(({ sheet, check }) => {
    if (!sheet) return;
    let row = sheetUsage.find((r) => r.sheet.id === sheet.id);
    if (!row) sheetUsage.push((row = { sheet, usedKg: 0, count: 0 }));
    row.usedKg += check.usedKg;
    row.count += 1;
  });

  const numbered = entries.length > 1;
  const firstProblem = saved.find((x) => x.check.problem);

  // Why the submit button is off — a silently disabled button is a dead end.
  const blockedReason = firstProblem
    ? `${numbered ? `Product ${firstProblem.i + 1}: ` : ""}${firstProblem.check.problem}`
    : "";

  const canSubmit = !blockedReason;
  const showBlockedReason = saved.some((x) => x.check.showProblem);

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(e);
  }

  const submitLabel = saving
    ? isAdd
      ? "Adding…"
      : "Updating…"
    : !isAdd
      ? "Update Product"
      : savedCount > 1
        ? `Add ${savedCount} Products`
        : "Add Product";

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
        aria-label={isAdd ? "Add Product" : "Edit Product"}
        className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isAdd ? "Add Product" : "Edit Product"}
            </h3>
            <p className="text-xs text-slate-400">
              {isAdd
                ? "Cut one or more products from a sheet"
                : "Cut products from a sheet"}
            </p>
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
          className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-6 py-5"
        >
          {entries.map((entry, i) => (
            <EntryCard
              key={entry.key}
              entry={entry}
              index={i}
              numbered={numbered}
              check={cards[i].check}
              sheets={sheets}
              sheet={cards[i].sheet}
              availableKg={availableFor(cards[i].sheet)}
              creditKg={creditFor(cards[i].sheet)}
              maxSize={cards[i].maxSize}
              canRemove={isAdd && entries.length > 1}
              onChange={(patch) => setEntry(entry.key, patch)}
              onRemove={() => removeEntry(entry.key)}
            />
          ))}

          {isAdd && (
            <AddRowButton
              onClick={addEntry}
              className="w-full justify-center py-3 text-sm"
            >
              Add Another Product
            </AddRowButton>
          )}
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
          {sheetUsage.length > 0 && (
            <div className="mx-6 mt-3 max-h-28 space-y-1 overflow-y-auto rounded-lg bg-slate-50 px-3 py-2">
              {sheetUsage.map(({ sheet, usedKg, count }) => {
                const remainingKg = availableFor(sheet) - usedKg;
                return (
                  <div
                    key={sheet.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="min-w-0 truncate text-xs font-medium text-slate-500">
                      Remaining in{" "}
                      <span className="font-semibold text-slate-700">
                        {sheet.name}
                      </span>
                      {count > 1 && (
                        <span className="font-normal text-slate-400">
                          {" "}
                          · {count} products
                        </span>
                      )}
                    </span>
                    {/* Negative is allowed — the backend lets stock go below
                        zero — so it's a heads-up, not an error. */}
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        remainingKg < 0 ? "text-amber-600" : "text-emerald-600"
                      }`}
                      title={
                        remainingKg < 0
                          ? "This sheet's stock will go negative. Saving is still allowed."
                          : undefined
                      }
                    >
                      {kgDisplay(remainingKg)} kg
                      {remainingKg < 0 && (
                        <span className="ml-1 text-[11px] font-medium">
                          (negative)
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
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
              className="inline-flex items-center gap-2 rounded-md bg-[#1E4D96] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
            >
              {!isAdd && <Check size={16} strokeWidth={2.5} />}
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
