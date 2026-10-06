import { useRef, useState } from "react";
import { Calendar, X } from "lucide-react";
import FilterSelect from "./FilterSelect";
import DateRangeFilter from "./DateRangeFilter";
import MenuPopover from "./MenuPopover";
import { isoToDMY } from "../utils/party";
import {
  PERIOD_OPTIONS,
  DEFAULT_PERIOD,
  rangeForPeriod,
  formatDateRange,
  todayISO,
} from "../utils/dateRange";

// "Custom" isn't pickable — it's what the chip reads once dates are hand-set.
const PRESETS = PERIOD_OPTIONS.filter((o) => o.value !== "custom");

/**
 * DateFilterBar
 * The period preset + from/to chips that Parties, Purchase and Production all
 * put above their lists. It owns the period/from/to state and reports upward
 * in the shape the API wants — `{ fromDate, toDate }` as DD/MM/YYYY, or
 * undefined when unset — so a page only tracks what it passes to its endpoint.
 *
 * `onChange` fires from user actions only, never from an effect, so an inline
 * arrow in the parent is safe.
 *
 * Phones (below `sm`) get a calendar icon instead of the chips, opening a
 * panel with just From and To — the presets are tablet-and-up only.
 */
export default function DateFilterBar({
  onChange,
  defaultPeriod = DEFAULT_PERIOD,
  className = "",
  // Toolbars that sit the chips beside a search box drop both — the Period
  // select names itself, and each chip clears itself from its own menu.
  showLabel = true,
  showReset = true,
}) {
  const initial = rangeForPeriod(defaultPeriod) ?? { from: "", to: "" };
  const [period, setPeriod] = useState(defaultPeriod);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  // Phones get one icon button instead of the two chips — see below.
  const [sheetOpen, setSheetOpen] = useState(false);
  const chipRef = useRef(null);

  const emit = (nextFrom, nextTo) =>
    onChange({
      fromDate: isoToDMY(nextFrom) || undefined,
      toDate: isoToDMY(nextTo) || undefined,
      from: nextFrom,
      to: nextTo,
    });

  function changePeriod(value) {
    setPeriod(value);
    const range = rangeForPeriod(value);
    // `custom` returns null — the user's own dates stand.
    if (!range) return emit(from, to);
    setFrom(range.from);
    setTo(range.to);
    emit(range.from, range.to);
  }

  function changeDate(which, value) {
    const nextFrom = which === "from" ? value : from;
    const nextTo = which === "to" ? value : to;
    setFrom(nextFrom);
    setTo(nextTo);
    setPeriod("custom");
    emit(nextFrom, nextTo);
  }

  const dirty =
    period !== defaultPeriod || from !== initial.from || to !== initial.to;

  const active = !!(from || to);
  const today = todayISO();
  const chipLabel =
    period === "custom"
      ? formatDateRange(from, to)
      : (PRESETS.find((o) => o.value === period)?.label ??
        formatDateRange(from, to));

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Phones: a calendar icon alone — the topbar has no room for a label.
          It names the range for screen readers and on long-press, and a dot
          marks a range moved off the default, since nothing else shows it. */}
      <button
        ref={chipRef}
        type="button"
        onClick={() => setSheetOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={sheetOpen}
        aria-label={`Date range: ${chipLabel}`}
        title={chipLabel}
        className={`relative inline-flex items-center justify-center rounded-lg border p-2 transition-colors sm:hidden ${
          active
            ? "border-[#BBD0EC] bg-[#EEF3FB] text-[#1E4D96]"
            : "border-slate-200 bg-white text-slate-500"
        }`}
      >
        <Calendar size={18} />
        {dirty && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#1E4D96] ring-2 ring-white" />
        )}
      </button>

      <MenuPopover
        open={sheetOpen}
        anchorRef={chipRef}
        onClose={() => setSheetOpen(false)}
        align="right"
        width={288}
        className="p-3"
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">
              From
            </span>
            <input
              type="date"
              value={from}
              max={to || today}
              onChange={(e) => changeDate("from", e.target.value)}
              className="date-field w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:border-[#1E4D96] focus:bg-white focus:outline-none"
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-medium text-slate-500">
              To
            </span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              max={today}
              onChange={(e) => changeDate("to", e.target.value)}
              className="date-field w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:border-[#1E4D96] focus:bg-white focus:outline-none"
            />
          </label>
        </div>
      </MenuPopover>

      {/* Tablet and up: the two chips. */}
      {showLabel && (
        <span className="hidden pr-1 text-sm font-medium text-slate-400 sm:inline">
          Filter by
        </span>
      )}
      <div className="hidden items-center gap-2 sm:flex">
        <FilterSelect
          label="Period"
          value={period}
          onChange={changePeriod}
          options={PRESETS}
          displayLabel={PERIOD_OPTIONS.find((o) => o.value === period)?.label}
          active={period !== defaultPeriod}
        />
        <DateRangeFilter
          from={from}
          to={to}
          onChange={changeDate}
          onReset={() => changePeriod(defaultPeriod)}
          canReset={dirty}
        />
      </div>
      {showReset && dirty && (
        <button
          type="button"
          onClick={() => changePeriod(defaultPeriod)}
          className="ml-auto hidden items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:inline-flex"
        >
          <X size={14} /> Reset
        </button>
      )}
    </div>
  );
}
