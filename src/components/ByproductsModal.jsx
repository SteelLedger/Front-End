import { useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { gmToKgDisplay } from "../utils/units";

/**
 * ByproductsModal
 * Small centered modal listing byproducts (name + qty in kg).
 * `state` = { loading, productName, byProducts } | null.
 *
 * The wrapper mounts the dialog only while there's state, so the Escape
 * listener and the scroll lock below live for exactly as long as it's open —
 * the same shape every other overlay in here uses.
 */
export default function ByproductsModal({ state, onClose }) {
  if (!state) return null;
  return <ByproductsDialog state={state} onClose={onClose} />;
}

function ByproductsDialog({ state, onClose }) {
  // Close on Escape, and freeze the page behind the dialog.
  useEffect(() => {
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
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Byproducts"
        className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Byproducts</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-2 rounded-md p-2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-400">{state.productName}</p>
        {state.loading ? (
          <div className="flex justify-center py-6 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : state.byProducts.length === 0 ? (
          <p className="py-2 text-sm text-slate-500">
            No byproducts for this product.
          </p>
        ) : (
          <ul className="space-y-2">
            {state.byProducts.map((b, i) => (
              <li
                key={b._id || i}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <span className="text-sm text-slate-700">
                  {b.byProductName}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {gmToKgDisplay(b.qty)} kg
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
