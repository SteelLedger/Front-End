// Date-range helpers shared by every list that filters on a period: Sales,
// Purchase, Production, Parties and the Dashboard.
//
// The API convention is the same everywhere — `fromDate` / `toDate` as
// inclusive DD/MM/YYYY strings — while the UI works in ISO (yyyy-mm-dd),
// which is what <input type="date"> speaks. Convert at the call site with
// `isoToDMY` from ./party.

/** Shown unfiltered — the option lists that open on "everything" lead with it. */
export const ALL_DATES = { value: "all", label: "All Dates" };

export const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

/** Presets for a list that opens with no date filter at all. */
export const PERIOD_OPTIONS_WITH_ALL = [ALL_DATES, ...PERIOD_OPTIONS];

function iso(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today as an ISO date — the ceiling for every range and date input. */
export const todayISO = () => iso(new Date());

/**
 * No range may reach past today. "This Month" in mid-August means the 1st to
 * today, not to the 31st: the rest of the month hasn't happened, and asking
 * the API for it only invites confusion about an empty tail.
 */
const clampToToday = (isoDate) => {
  const today = todayISO();
  return isoDate && isoDate > today ? today : isoDate;
};

/**
 * From/to ISO dates for a period preset.
 * `all` clears the range; `custom` returns null so the user's own dates stand.
 */
export function rangeForPeriod(period) {
  const range = periodRange(period);
  return range ? { from: range.from, to: clampToToday(range.to) } : range;
}

function periodRange(period) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = now.getDate();

  switch (period) {
    case "all":
      return { from: "", to: "" };
    case "today":
      return { from: iso(now), to: iso(now) };
    case "yesterday": {
      const d = new Date(y, m, day - 1);
      return { from: iso(d), to: iso(d) };
    }
    case "this_week": {
      // Week starts Monday.
      const start = new Date(y, m, day - ((now.getDay() + 6) % 7));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: iso(start), to: iso(end) };
    }
    case "this_month":
      return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "last_month":
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case "this_quarter": {
      const q = Math.floor(m / 3) * 3;
      return { from: iso(new Date(y, q, 1)), to: iso(new Date(y, q + 3, 0)) };
    }
    case "this_year":
      return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) };
    default:
      return null;
  }
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-08-01" -> "01 Aug 2026" */
export function formatISODate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d} ${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

/** A range as one readable label for the filter chip. */
export function formatDateRange(fromISO, toISO) {
  if (!fromISO && !toISO) return "All dates";
  if (!fromISO) return `Until ${formatISODate(toISO)}`;
  if (!toISO) return `From ${formatISODate(fromISO)}`;
  if (fromISO === toISO) return formatISODate(fromISO);

  const [fy, fm, fd] = fromISO.split("-");
  const [ty, tm, td] = toISO.split("-");
  // Same year reads fine without repeating it on both sides.
  if (fy === ty) {
    return `${fd} ${MONTHS[Number(fm) - 1]} – ${td} ${MONTHS[Number(tm) - 1]} ${ty}`;
  }
  return `${formatISODate(fromISO)} – ${formatISODate(toISO)}`;
}
