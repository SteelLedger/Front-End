import { useEffect } from "react";
import { X, ReceiptText } from "lucide-react";
import { gmToKgDisplay } from "../utils/units";
import { lineLabel } from "../utils/purchase";

const dash = (v) => (v && String(v).trim() ? v : "—");

/**
 * PurchaseBillModal
 * The whole bill in one place: supplier, invoice and date up top, every line
 * item spelled out, and the totals underneath. The list only shows a bill's
 * first line, so this is where the rest of it lives.
 */
export default function PurchaseBillModal({ open, bill, onClose }) {
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

  if (!open || !bill) return null;

  const lines = bill.lineItems ?? [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Purchase ${bill.invoiceNumber || ""}`}
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E4D96]">
              <ReceiptText size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-slate-900">
                {dash(bill.invoiceNumber)}
              </h3>
              <p className="truncate text-xs text-slate-400">
                {dash(bill.supplier)} · {dash(bill.date)}
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
              This bill has no items.
            </p>
          ) : (
            <>
              {/* Phones: one block per line */}
              <div className="divide-y divide-slate-100 sm:hidden">
                {lines.map((l, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-medium text-slate-800">
                        {lineLabel(l)}
                      </span>
                      <span className="shrink-0 whitespace-nowrap font-semibold text-slate-900">
                        {gmToKgDisplay(l.quantity || 0)} kg
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Size {dash(l.size)} · Point {dash(l.point)} · Grade{" "}
                      {dash(l.grade)} · {l.bundles || 0}{" "}
                      {l.bundles === 1 ? "bundle" : "bundles"}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tablet and up: the full breakdown */}
              <table className="hidden w-full text-sm sm:table">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2.5 font-semibold">
                      Raw Material Sheet
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Size</th>
                    <th className="px-3 py-2.5 font-semibold">Point</th>
                    <th className="px-3 py-2.5 font-semibold">Grade</th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Bundles
                    </th>
                    <th className="px-5 py-2.5 text-right font-semibold">
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className="px-5 py-2.5 font-medium text-slate-800">
                        {lineLabel(l)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {dash(l.size)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {dash(l.point)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {dash(l.grade)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">
                        {l.bundles || 0}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-right font-semibold text-slate-900">
                        {gmToKgDisplay(l.quantity || 0)} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Totals */}
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 border-t border-slate-100 px-5 py-3 text-sm">
          <span className="font-semibold text-slate-600">
            {lines.length} {lines.length === 1 ? "item" : "items"}
          </span>
          <span className="text-slate-500">
            Bundles:{" "}
            <span className="font-semibold text-slate-700">
              {bill.totalBundles || 0}
            </span>
          </span>
          <span className="text-slate-500">
            Total:{" "}
            <span className="font-semibold text-slate-900">
              {gmToKgDisplay(bill.totalQuantity || 0)} kg
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
