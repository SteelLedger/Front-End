import { useEffect } from "react";
import { X, Plus, Minus, FileUp, Info } from "lucide-react";
import { gmToKgDisplay } from "../utils/units";

const dash = (v) => (v && String(v).trim() ? v : "—");

/**
 * The info icon in an inbound-history row's Action column that opens this
 * dialog. Pages render it only on rows that carry details.
 */
export function AdjustmentDetailsButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="View details"
      title="View details"
      className="-m-1 rounded-md p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#1E4D96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
    >
      <Info size={16} />
    </button>
  );
}

/** Header icon, title and tone per kind of entry. */
const KINDS = {
  add: {
    title: "Stock added",
    icon: Plus,
    tone: "bg-amber-50 text-amber-600",
    sign: "+",
  },
  reduce: {
    title: "Stock reduced",
    icon: Minus,
    tone: "bg-rose-50 text-rose-600",
    sign: "−",
  },
  imported: {
    title: "Imported",
    icon: FileUp,
    tone: "bg-teal-50 text-teal-600",
    sign: "+",
  },
};

function kindOf(entry) {
  if (entry.entryType === "imported") return KINDS.imported;
  return entry.adjustmentDirection === "reduce" ? KINDS.reduce : KINDS.add;
}

/**
 * AdjustmentDetailsModal
 * The `adjustmentDetails` typed against one inbound-history entry, in full —
 * a manual stock adjustment's reason, or a CSV import's note. The history
 * table never shows it inline; this dialog, behind the row's info icon, is the
 * only place it's read.
 */
export default function AdjustmentDetailsModal({ open, entry, onClose }) {
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

  if (!open || !entry) return null;

  const { title, icon: Icon, tone, sign } = kindOf(entry);
  const reduce = sign === "−";
  // Same sign handling as the history rows: the magnitude, signed by kind.
  const kg = gmToKgDisplay(Math.abs(Number(entry.quantity) || 0));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} details`}
        className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}
            >
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">
                {title}
              </h3>
              <p className="truncate text-xs text-slate-400">
                {dash(entry.date)} ·{" "}
                <span
                  className={`font-semibold ${reduce ? "text-rose-600" : "text-slate-600"}`}
                >
                  {sign}
                  {kg} kg
                </span>
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

        {/* Details */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Details
          </p>
          <p className="whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-relaxed text-slate-700">
            {String(entry.adjustmentDetails ?? "").trim()}
          </p>
        </div>
      </div>
    </div>
  );
}
