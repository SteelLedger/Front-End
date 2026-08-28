import { useRef, useState } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import FilterSelect from "./FilterSelect";
import DateRangeFilter from "./DateRangeFilter";
import MenuPopover from "./MenuPopover";
import { isoToDMY } from "../utils/party";
import {
  PERIOD_OPTIONS_WITH_ALL,
  rangeForPeriod,
  formatDateRange,
  todayISO,
} from "../utils/dateRange";

// "Custom" isn't pickable — it's what the chip reads once dates are hand-set.
const PRESETS = PERIOD_OPTIONS_WITH_ALL.filter((o) => o.value !== "custom");

/**
 * DateFilterBar
 * The period preset + from/to chips that Parties, Purchase and Production all
 * put above their lists. It owns the period/from/to state and reports upward
 * in the shape the API wants — `{ fromDate, toDate }` as DD/MM/YYYY, or
 * undefined when unset — so a page only tracks what it passes to its endpoint.
 *
 * `onChange` fires from user actions only, never from an effect, so an inline
 * arrow in the parent is safe.
 */
export default function DateFilterBar({
  onChange,
  defaultPeriod = "all",
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
  // Phones get one chip instead of two — see the sheet at the bottom.
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

  function clearDates() {
    setFrom("");
    setTo("");
    setPeriod("all");
    emit("", "");
  }

  const dirty = period !== defaultPeriod || !!from || !!to;

  const active = !!(from || to);
  const today = todayISO();
  const chipLabel =
    period === "custom"
      ? formatDateRange(from, to)
      : (PRESETS.find((o) => o.value === period)?.label ?? "All Dates");

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Phones: one chip. Two would wrap out of the topbar's height. */}
      <button
        ref={chipRef}
        type="button"
        onClick={() => setSheetOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={sheetOpen}
        className={`inline-flex max-w-[7.5rem] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors sm:hidden ${
          active
            ? "border-[#BBD0EC] bg-[#EEF3FB] text-[#1E4D96]"
            : "border-slate-200 bg-white text-slate-700"
        }`}
      >
        <Calendar
          size={14}
          className={`shrink-0 ${active ? "text-[#1E4D96]/70" : "text-slate-400"}`}
        />
        <span className="truncate font-semibold">{chipLabel}</span>
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>

      <MenuPopover
        open={sheetOpen}
        anchorRef={chipRef}
        onClose={() => setSheetOpen(false)}
        align="right"
        width={288}
        className="p-3"
      >
        <div className="grid grid-cols-2 gap-1">
          {PRESETS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitem"
              onClick={() => {
                changePeriod(o.value);
                setSheetOpen(false);
              }}
              className={`rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                o.value === period
                  ? "bg-[#EEF3FB] font-semibold text-[#1E4D96]"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5">
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
          displayLabel={
            PERIOD_OPTIONS_WITH_ALL.find((o) => o.value === period)?.label
          }
          active={period !== defaultPeriod}
        />
        <DateRangeFilter
          from={from}
          to={to}
          onChange={changeDate}
          onClear={clearDates}
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
