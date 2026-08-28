import { useRef, useState } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import MenuPopover from "./MenuPopover";
import { formatDateRange, todayISO } from "../utils/dateRange";

const DATE_INPUT =
  "date-field relative w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm " +
  "text-slate-700 transition-colors focus:border-[#1E4D96] focus:bg-white focus:outline-none " +
  "focus:ring-2 focus:ring-[#1E4D96]/25";

/**
 * DateRangeFilter
 * A chip showing the active range ("01 Aug – 31 Aug 2026") that opens a small
 * From/To panel. Beats two bare <input type="date"> sitting in the filter bar:
 * the dd-mm-yyyy placeholders and duplicate browser calendar glyphs read as
 * clutter, and an empty range gave no hint that nothing was being filtered.
 */
export default function DateRangeFilter({ from, to, onChange, onClear }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const active = !!(from || to);

  const invalid = from && to && from > to;
  // Same rule as the compact menu: nothing past today is selectable.
  const today = todayISO();

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40 ${
          active
            ? "border-[#BBD0EC] bg-[#EEF3FB] text-[#1E4D96]"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <Calendar
          size={15}
          className={active ? "text-[#1E4D96]/70" : "text-slate-400"}
        />
        <span className="font-semibold">{formatDateRange(from, to)}</span>
        <ChevronDown
          size={15}
          className={`transition-transform ${open ? "rotate-180" : ""} ${
            active ? "text-[#1E4D96]/70" : "text-slate-400"
          }`}
        />
      </button>

      <MenuPopover
        open={open}
        anchorRef={btnRef}
        onClose={() => setOpen(false)}
        width={280}
        className="p-3"
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">
              From
            </span>
            <input
              type="date"
              value={from}
              max={to || today}
              onChange={(e) => onChange("from", e.target.value)}
              className={DATE_INPUT}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500">
              To
            </span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              max={today}
              onChange={(e) => onChange("to", e.target.value)}
              className={DATE_INPUT}
            />
          </label>

          {invalid && (
            <p className="text-xs font-medium text-rose-600">
              The end date is before the start date.
            </p>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={onClear}
              disabled={!active}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <X size={13} /> Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-[#1E4D96] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1A3F7A]"
            >
              Done
            </button>
          </div>
        </div>
      </MenuPopover>
    </>
  );
}
