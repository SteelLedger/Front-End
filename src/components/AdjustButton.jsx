import { SlidersHorizontal } from "lucide-react";

/**
 * AdjustButton
 * Opens the manual stock correction for one inventory row. Shared by the Raw
 * Material page's table and the InventoryTab that drives the Product one, so
 * the action reads the same on both.
 */
export default function AdjustButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Adjust stock"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#1E4D96] hover:bg-blue-50 hover:text-[#1E4D96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40 ${className}`}
    >
      <SlidersHorizontal size={13} />
      Adjust
    </button>
  );
}
