import { useEffect, useRef } from "react";
import {
  X,
  Plus,
  Check,
  Package,
  Boxes,
  AlertTriangle,
  CornerDownLeft,
} from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { gmToKgDisplay, kgToGm } from "../utils/units";
import {
  PAYMENT_TYPES,
  emptyLine,
  filledLines,
  isCompleteLine,
  isPartialLine,
  linesTotalGm,
} from "../utils/sales";

const FIELD =
  "w-full rounded-lg border px-3 py-2.5 text-sm text-slate-700 " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-1";
const OK = "border-slate-300 focus:border-[#1E4D96] focus:ring-[#1E4D96]/30";
const BAD = "border-rose-400 focus:border-rose-500 focus:ring-rose-300";

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

/* ------------------------------ added item row ---------------------------- */

/**
 * A committed line as an inline chip. These wrap left-to-right rather than
 * stacking, so a dozen items take three or four lines instead of twelve.
 * Quantity stays editable in place — a typo shouldn't mean re-picking the item;
 * the item itself is fixed (remove and re-add to change it).
 */
function AddedChip({ line, stockGm, onQty, onRemove }) {
  const overBy = Math.max(0, kgToGm(line.qty) - stockGm);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border py-1 pl-2.5 pr-1 ${
        overBy ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
      }`}
      title={
        overBy
          ? `${line.name} — exceeds stock by ${gmToKgDisplay(overBy)} kg (${gmToKgDisplay(stockGm)} kg available)`
          : line.name
      }
    >
      {overBy > 0 && (
        <AlertTriangle size={12} className="shrink-0 text-amber-500" />
      )}
      {/* Roomier than the products need, because a byproduct label carries its
          source material too — "Khuniya (12X120K M8)". */}
      <span className="max-w-[13rem] truncate text-sm font-medium text-slate-800">
        {line.name}
      </span>
      <input
        type="text"
        inputMode="decimal"
        min="0"
        step="any"
        value={line.qty}
        onChange={(e) => onQty(e.target.value)}
        aria-label={`Quantity for ${line.name} in kg`}
        className="w-12 shrink-0 rounded-md border border-transparent bg-slate-100/80 px-1.5 py-0.5 text-right text-sm font-semibold text-slate-800 hover:border-slate-300 focus:border-[#1E4D96] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E4D96]/30"
      />
      <span className="shrink-0 text-[11px] text-slate-400">kg</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${line.name}`}
        title="Remove"
        className="shrink-0 rounded-md p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </span>
  );
}

/* -------------------------------- section --------------------------------- */

function LineSection({
  title,
  icon: Icon,
  tone,
  lines,
  draft,
  options,
  onDraftChange,
  onCommit,
  onLinesChange,
  addLabel,
  emptyText,
  placeholder,
  noun,
  invalid,
}) {
  const qtyRef = useRef(null);
  const totalGm = linesTotalGm(lines);

  // An item already on the sale shouldn't be offered again — edit its row.
  const available = options.filter((o) => !lines.some((l) => l.id === o.id));
  const selected = options.find((o) => o.id === draft.id) || null;
  const draftOverBy = selected
    ? Math.max(0, kgToGm(draft.qty) - selected.totalQtyGm)
    : 0;
  const canAdd = isCompleteLine(draft);

  const stockOf = (id) =>
    options.find((o) => o.id === id)?.totalQtyGm ?? Infinity;

  function pick(name) {
    const match = available.find(
      (o) => o.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    onDraftChange({ ...draft, id: match ? match.id : "", name });
    if (match) requestAnimationFrame(() => qtyRef.current?.focus());
  }

  function commit() {
    if (!canAdd) return;
    onCommit();
    requestAnimationFrame(() => qtyRef.current?.blur());
  }

  return (
    <section
      className={`rounded-2xl border p-3 ${
        invalid
          ? "border-rose-300 bg-rose-50/40"
          : "border-slate-200 bg-slate-50/60"
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-md ${tone}`}
          >
            <Icon size={13} />
          </span>
          {title}
          {lines.length > 0 && (
            <span className="rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {lines.length}
            </span>
          )}
        </span>
        {totalGm > 0 && (
          <span className="text-xs font-semibold text-slate-500">
            {gmToKgDisplay(totalGm)} kg
          </span>
        )}
      </div>

      {/* Composer */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <SearchableSelect
            value={draft.name}
            onChange={pick}
            options={available.map((o) => o.name)}
            placeholder={placeholder}
            allowCustom={false}
            noun={noun}
            emptyText={
              options.length
                ? `Every ${noun} is already on this sale`
                : `No ${noun}s yet`
            }
          />
        </div>
        <div className="flex items-start gap-2">
          <div className="relative flex-1 sm:w-24 sm:flex-none">
            <input
              ref={qtyRef}
              type="text"
              inputMode="decimal"
              min="0"
              step="any"
              value={draft.qty}
              onChange={(e) => onDraftChange({ ...draft, qty: e.target.value })}
              onKeyDown={(e) => {
                // Enter adds the line so a run of items can be keyed in fast.
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
              }}
              placeholder="Qty"
              aria-label="Quantity in kg"
              className={`${FIELD} ${OK} pr-8 text-right`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
              kg
            </span>
          </div>
          <button
            type="button"
            onClick={commit}
            disabled={!canAdd}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#1E4D96] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Plus size={15} strokeWidth={2.5} />
            Add
          </button>
        </div>
      </div>

      {/* Composer hints */}
      {selected && (
        <p
          className={`mt-1.5 flex items-center gap-1 text-xs ${
            draftOverBy ? "font-medium text-amber-600" : "text-slate-400"
          }`}
        >
          {draftOverBy ? (
            <>
              <AlertTriangle size={12} />
              Exceeds stock by {gmToKgDisplay(draftOverBy)} kg — in stock{" "}
              {gmToKgDisplay(selected.totalQtyGm)} kg
            </>
          ) : (
            <>
              In stock: {gmToKgDisplay(selected.totalQtyGm)} kg
              {canAdd && (
                <span className="ml-1 inline-flex items-center gap-1 text-slate-300">
                  · <CornerDownLeft size={11} /> Enter to add
                </span>
              )}
            </>
          )}
        </p>
      )}

      {/* Committed lines. Capped so both sections stay visible with many items. */}
      {lines.length === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-center text-xs text-slate-400">
          {emptyText}
        </p>
      ) : (
        <div className="mt-2 flex max-h-44 flex-wrap gap-1.5 overflow-y-auto overscroll-contain pr-0.5">
          {lines.map((line, i) => (
            <AddedChip
              key={line.id}
              line={line}
              stockGm={stockOf(line.id)}
              onQty={(qty) =>
                onLinesChange(
                  lines.map((l, idx) => (idx === i ? { ...l, qty } : l)),
                )
              }
              onRemove={() =>
                onLinesChange(lines.filter((_, idx) => idx !== i))
              }
            />
          ))}
        </div>
      )}

      <span className="sr-only">{addLabel}</span>
    </section>
  );
}

/* --------------------------------- drawer --------------------------------- */

const REQUIRED = ["date", "invoiceNumber", "partyId", "paymentType"];

/**
 * AddSaleDrawer
 * Right-side panel for creating / editing a sale. A sale carries any mix of
 * product and byproduct lines: products only, byproducts only, or both.
 *
 * Each section is a composer (pick item + qty -> Add) above a compact list of
 * what's been added, so a sale with a dozen lines still reads at a glance.
 * Quantities are in kg; the parent converts to grams for the wire.
 */
export default function AddSaleDrawer({
  open,
  mode,
  formState,
  setFormState,
  saving,
  partyOptions = [],
  productOptions = [],
  byProductOptions = [],
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

  const update = (patch) =>
    setFormState((f) => ({ ...f, ...patch, error: "", errorFields: [] }));

  const setDraft = (key) => (line) =>
    setFormState((f) => ({
      ...f,
      draft: { ...f.draft, [key]: line },
      error: "",
    }));

  const setLines = (key) => (lines) =>
    setFormState((f) => ({ ...f, [key]: lines, error: "" }));

  // Move the composer's line into the list and clear it for the next entry.
  const commitDraft = (key) =>
    setFormState((f) => {
      const line = f.draft[key];
      if (!isCompleteLine(line)) return f;
      return {
        ...f,
        [key]: [...f[key], line],
        draft: { ...f.draft, [key]: emptyLine() },
        error: "",
      };
    });

  function pickParty(val) {
    const match = partyOptions.find(
      (o) => o.name.trim().toLowerCase() === val.trim().toLowerCase(),
    );
    update({ partyName: val, partyId: match ? match.id : "" });
  }

  const draft = formState.draft ?? {
    products: emptyLine(),
    byProducts: emptyLine(),
  };
  // A finished-but-unadded composer row still counts — losing it on save would
  // be a nasty surprise, so it gets committed for us at submit time.
  const pendingProducts = isCompleteLine(draft.products)
    ? [draft.products]
    : [];
  const pendingByProducts = isCompleteLine(draft.byProducts)
    ? [draft.byProducts]
    : [];
  const allProducts = [...formState.products, ...pendingProducts];
  const allByProducts = [...formState.byProducts, ...pendingByProducts];

  const productCount = allProducts.length;
  const byProductCount = allByProducts.length;
  const itemCount = productCount + byProductCount;
  const totalGm = linesTotalGm(allProducts) + linesTotalGm(allByProducts);

  function handleSubmit(e) {
    e.preventDefault();

    const missing = REQUIRED.filter(
      (name) => !String(formState[name] ?? "").trim(),
    );

    let error = "";
    if (missing.length) {
      error =
        !formState.partyId && formState.partyName.trim()
          ? "Pick the party from the list."
          : "Fill in the invoice details.";
    } else if (
      isPartialLine(draft.products) ||
      isPartialLine(draft.byProducts)
    ) {
      error =
        "Finish the line you're adding — it needs both an item and a quantity.";
    } else if (itemCount === 0) {
      error = "Add at least one product or byproduct to this sale.";
    }

    if (error) {
      setFormState((f) => ({ ...f, error, errorFields: missing }));
      return;
    }

    // Fold in any completed composer rows. setFormState is async, so hand the
    // resolved form to onSubmit directly — reading parent state here would
    // still see the pre-commit value and silently drop the pending line.
    const resolved = {
      ...formState,
      products: filledLines(allProducts),
      byProducts: filledLines(allByProducts),
      draft: { products: emptyLine(), byProducts: emptyLine() },
      error: "",
      errorFields: [],
    };
    setFormState(resolved);
    onSubmit(e, resolved);
  }

  const errs = formState.errorFields || [];
  const cls = (name) => `${FIELD} ${errs.includes(name) ? BAD : OK}`;
  const noItems = formState.error?.startsWith("Add at least one");

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
        aria-label={mode === "add" ? "Add Sale" : "Edit Sale"}
        className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {mode === "add" ? "Add Sale" : "Edit Sale"}
            </h3>
            <p className="text-xs text-slate-400">
              Sell any mix of products and byproducts on one invoice
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
          id="sale-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
        >
          {formState.error && (
            <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              <AlertTriangle size={13} />
              {formState.error}
            </p>
          )}

          {/* Invoice details */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date" required>
              <input
                type="date"
                value={formState.date}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => update({ date: e.target.value })}
                className={`date-field relative ${cls("date")}`}
              />
            </Field>
            <Field label="Invoice Number" required>
              <input
                value={formState.invoiceNumber}
                onChange={(e) => update({ invoiceNumber: e.target.value })}
                placeholder="e.g. SAL-2024-001"
                className={cls("invoiceNumber")}
              />
            </Field>
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Party Name<span className="ml-0.5 text-rose-500">*</span>
              </span>
              <SearchableSelect
                inputRef={partyRef}
                value={formState.partyName}
                onChange={pickParty}
                options={partyOptions.map((o) => o.name)}
                placeholder="Search or select a party"
                invalid={errs.includes("partyId")}
                allowCustom={false}
                noun="party"
                emptyText="No parties yet"
              />
            </div>
            <Field label="Payment Type" required>
              <select
                value={formState.paymentType}
                onChange={(e) => update({ paymentType: e.target.value })}
                className={`${cls("paymentType")} ${
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
          </div>

          {/* Items */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sale items
            </p>

            <LineSection
              title="Products"
              icon={Package}
              tone="bg-blue-100 text-[#1E4D96]"
              lines={formState.products}
              draft={draft.products}
              options={productOptions}
              onDraftChange={setDraft("products")}
              onCommit={() => commitDraft("products")}
              onLinesChange={setLines("products")}
              addLabel="Add product"
              emptyText="No products added yet."
              placeholder="Search or select a product"
              noun="product"
              invalid={noItems}
            />

            <LineSection
              title="Byproducts"
              icon={Boxes}
              tone="bg-violet-100 text-violet-700"
              lines={formState.byProducts}
              draft={draft.byProducts}
              options={byProductOptions}
              onDraftChange={setDraft("byProducts")}
              onCommit={() => commitDraft("byProducts")}
              onLinesChange={setLines("byProducts")}
              addLabel="Add byproduct"
              emptyText="No byproducts added yet."
              placeholder="Search or select a byproduct"
              noun="byproduct"
              invalid={noItems}
            />
          </div>
        </form>

        {/* Footer: running total + actions */}
        <div className="border-t border-slate-200">
          <div className="flex items-center justify-between px-6 py-2.5 text-xs">
            <span className="text-slate-500">
              {itemCount === 0 ? (
                "No items added"
              ) : (
                <>
                  <span className="font-semibold text-slate-700">
                    {itemCount} item{itemCount === 1 ? "" : "s"}
                  </span>
                  {productCount > 0 &&
                    ` · ${productCount} product${productCount === 1 ? "" : "s"}`}
                  {byProductCount > 0 &&
                    ` · ${byProductCount} byproduct${byProductCount === 1 ? "" : "s"}`}
                </>
              )}
            </span>
            <span className="font-semibold text-slate-800">
              {gmToKgDisplay(totalGm)} kg total
            </span>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="sale-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1E4D96] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A] disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
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
    </div>
  );
}
