import { useEffect } from "react";
import { X, ReceiptText } from "lucide-react";
import { gmToKgDisplay } from "../utils/units";
import { paymentTypeLabel, saleLines } from "../utils/sales";

const dash = (v) => (v && String(v).trim() ? v : "—");

/**
 * SaleItemsModal
 * Everything sold on one invoice: party, date and payment up top, then every
 * product and byproduct line. The list only shows a sale's first item, so this
 * is where the rest of it lives.
 */
export default function SaleItemsModal({ open, sale, onClose }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !sale) return null;

  const lines = saleLines(sale);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Sale ${sale.invoiceNumber || ""}`}
        className="relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E4D96]">
              <ReceiptText size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-slate-900">
                {dash(sale.invoiceNumber)}
              </h3>
              <p className="truncate text-xs text-slate-400">
                {dash(sale.partyName)} · {dash(sale.date)} ·{" "}
                {paymentTypeLabel(sale.paymentType)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-2 rounded-md p-2 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto">
          {lines.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              This sale has no items.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-semibold">Item</th>
                  <th className="px-3 py-2.5 font-semibold">Type</th>
                  <th className="px-5 py-2.5 text-right font-semibold">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((l) => (
                  <tr key={l.key}>
                    <td className="px-5 py-2.5">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            l.kind === "product"
                              ? "bg-[#1E4D96]"
                              : "bg-violet-500"
                          }`}
                        />
                        <span className="font-medium text-slate-800">
                          {l.label}
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">
                      {l.kind === "product" ? "Product" : "Byproduct"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-right font-semibold text-slate-900">
                      {gmToKgDisplay(l.quantity)} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Totals */}
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 border-t border-slate-100 px-5 py-3 text-sm">
          <span className="font-semibold text-slate-600">
            {lines.length} {lines.length === 1 ? "item" : "items"}
          </span>
          <span className="text-slate-500">
            Products:{" "}
            <span className="font-semibold text-slate-700">
              {gmToKgDisplay(sale.totalProductQty || 0)} kg
            </span>
          </span>
          <span className="text-slate-500">
            Byproducts:{" "}
            <span className="font-semibold text-slate-700">
              {gmToKgDisplay(sale.totalByProductQty || 0)} kg
            </span>
          </span>
          <span className="text-slate-500">
            Total:{" "}
            <span className="font-semibold text-slate-900">
              {gmToKgDisplay(sale.totalQuantity || 0)} kg
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
