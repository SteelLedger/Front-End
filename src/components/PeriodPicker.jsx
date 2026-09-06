import { useRef, useState } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import MenuPopover from "./MenuPopover";
import { isoToDMY } from "../utils/party";
import {
  PERIOD_OPTIONS,
  rangeForPeriod,
  matchPeriod,
  formatDateRange,
  todayISO,
} from "../utils/dateRange";

// "Custom" is never picked from the list — it is what the control reads once
// the dates are set by hand.
const PRESETS = PERIOD_OPTIONS.filter((o) => o.value !== "custom");

const DATE_INPUT =
  "date-field w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 " +
  "text-xs text-slate-700 focus:border-[#1E4D96] focus:bg-white focus:outline-none";

/**
 * PeriodPicker
 * One full-width control for a date range: the preset on top, the dates it
 * resolves to underneath, and a panel holding both the presets and From/To.
 *
 * DateFilterBar is the toolbar version of this and puts the preset and the
 * range in two side-by-side chips — which needs about 340px of clear width.
 * Inside a card that is not available, and the chips wrap into an unreadable
 * stack, so this collapses them into a single control that fits any column
 * down to a 320px phone.
 *
 * Controlled: the range lives with the caller, and the preset is derived from
 * it rather than tracked, so the label can never disagree with the dates.
 */
export default function PeriodPicker({
  value,
  onChange,
  min,
  max = todayISO(),
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  const from = value?.from ?? "";
  const to = value?.to ?? "";
  const period = matchPeriod(from, to);
  const presetLabel =
    period === "custom"
      ? "Custom range"
      : (PRESETS.find((o) => o.value === period)?.label ?? "Custom range");

  const emit = (nextFrom, nextTo) =>
    onChange({
      fromDate: isoToDMY(nextFrom) || undefined,
      toDate: isoToDMY(nextTo) || undefined,
      from: nextFrom,
      to: nextTo,
    });

  function choosePreset(v) {
    const r = rangeForPeriod(v);
    if (r) emit(r.from, r.to);
    setOpen(false);
  }

  function changeDate(which, next) {
    emit(which === "from" ? next : from, which === "to" ? next : to);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40 disabled:opacity-60 ${
          open
            ? "border-[#1E4D96] bg-white"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <Calendar size={16} className="shrink-0 text-[#1E4D96]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800">
            {presetLabel}
          </span>
          <span className="block truncate text-[11px] text-slate-400">
            {formatDateRange(from, to)}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <MenuPopover
        open={open}
        anchorRef={btnRef}
        onClose={() => setOpen(false)}
        className="p-2.5"
      >
        <div className="grid grid-cols-2 gap-1">
          {PRESETS.map((o) => {
            const selected = o.value === period;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitem"
                onClick={() => choosePreset(o.value)}
                className={`flex items-center justify-between gap-1 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                  selected
                    ? "bg-[#EEF3FB] font-semibold text-[#1E4D96]"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="truncate">{o.label}</span>
                {selected && <Check size={12} className="shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5">
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">
              From
            </span>
            <input
              type="date"
              value={from}
              min={min || undefined}
              max={to || max}
              onChange={(e) => changeDate("from", e.target.value)}
              className={DATE_INPUT}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">
              To
            </span>
            <input
              type="date"
              value={to}
              min={from || min || undefined}
              max={max}
              onChange={(e) => changeDate("to", e.target.value)}
              className={DATE_INPUT}
            />
          </label>
        </div>
      </MenuPopover>
    </>
  );
}
