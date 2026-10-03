import { useState } from "react";
import { toast } from "react-toastify";
import {
  ShoppingCart,
  Factory,
  Receipt,
  Layers,
  Package,
  Mail,
  Loader2,
  CheckCircle2,
  CalendarRange,
  FileSpreadsheet,
  Filter,
  ChevronDown,
  Download,
} from "lucide-react";
import PeriodPicker from "../components/PeriodPicker";
import InfoTip from "../components/InfoTip";
import { requestReport } from "../services/apiServices";
import { PRODUCTION_TYPES } from "../utils/production";
import { defaultDateRange, rangeForPeriod } from "../utils/dateRange";
import {
  REPORTS,
  TONES,
  MAX_RANGE_YEARS,
  rangeProblem,
  earliestISO,
} from "../utils/reports";
import { getCurrentUser } from "../utils/auth";

const ICONS = { ShoppingCart, Factory, Receipt, Layers, Package };

/** The range a history card opens on, in both the shapes the page needs. */
function initialRange() {
  const iso = rangeForPeriod("this_month");
  return { ...defaultDateRange(), from: iso.from, to: iso.to };
}

/**
 * The optional line-type filter on Production History. A native select, dressed
 * to sit under the PeriodPicker without looking like a different control.
 */
function ProductionTypeFilter({ id, value, onChange }) {
  return (
    <div className="mt-4">
      <span
        id={`${id}-label`}
        className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
      >
        Production Type
        <InfoTip text="Only include runs cut on this line type. Leave it on All to include every run." />
      </span>
      <div className="relative">
        <Filter
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#1E4D96]"
        />
        <select
          aria-labelledby={`${id}-label`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-lg border bg-white py-2.5 pl-9 pr-9 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-300 focus:border-[#1E4D96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40 ${
            value ? "border-[#1E4D96]/40" : "border-slate-200"
          }`}
        >
          <option value="">All production types</option>
          {PRODUCTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

/**
 * The download icon that queues a report. It sits in line with the card's
 * period picker (or its "no date range" line), so the label it lacks lives in
 * `aria-label` and the tooltip — which also say the CSV comes by email, since
 * a download icon alone would promise a file right away.
 */
function RequestButton({ label, busy, queued, disabled, onClick, className = "" }) {
  const title = busy
    ? `Requesting ${label}…`
    : `${queued ? "Request again" : "Request"}: ${label} CSV (emailed to you)`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      title={title}
      className={`flex w-12 shrink-0 items-center justify-center rounded-lg bg-[#1E4D96] text-white transition-colors hover:bg-[#1A3F7A] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50 ${className}`}
    >
      {busy ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <Download size={18} />
      )}
    </button>
  );
}

/**
 * ReportCard
 * One report: what it contains, how it is scoped, and a download icon beside
 * the scope to queue it. History reports carry the app's usual period picker,
 * plus any filters the report takes; inventory reports have nothing to
 * configure, so they say so rather than showing a disabled control.
 */
function ReportCard({
  report,
  range,
  onRangeChange,
  filters = {},
  onFiltersChange,
  onRequest,
  state,
}) {
  const Icon = ICONS[report.icon] ?? FileSpreadsheet;
  const isHistory = report.kind === "history";
  const problem = isHistory ? rangeProblem(range?.from, range?.to) : "";
  const busy = state?.status === "sending";
  const queued = state?.status === "queued" ? state : null;
  // Shown directly under the row the button sits in.
  const queuedNote = queued && (
    <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 size={14} className="shrink-0" />
      <span className="truncate">Queued. Check your email.</span>
    </p>
  );

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
            TONES[report.tone] ?? TONES.blue
          }`}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-slate-900">
            {report.label}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {report.description}
          </p>
        </div>
      </div>

      {/* Scope */}
      <div className="mt-4 border-t border-slate-100 pt-4">
        {isHistory ? (
          <>
            <span className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Period
              <InfoTip
                text={`Reports reach back at most ${MAX_RANGE_YEARS} years and can cover at most ${MAX_RANGE_YEARS} years at a time.`}
              />
            </span>
            {/* The button stretches to the picker's two-line height. */}
            <div className="flex items-stretch gap-2">
              <div className="min-w-0 flex-1">
                <PeriodPicker
                  value={range}
                  onChange={onRangeChange}
                  min={earliestISO()}
                />
              </div>
              <RequestButton
                label={report.label}
                busy={busy}
                queued={!!queued}
                disabled={busy || !!problem}
                onClick={onRequest}
              />
            </div>
            {queuedNote}
            {problem && (
              <p className="mt-2 text-xs font-medium text-rose-600">
                {problem}
              </p>
            )}
            {report.filters?.includes("productionType") && (
              <ProductionTypeFilter
                id={`${report.type}-production-type`}
                value={filters.productionType ?? ""}
                onChange={(productionType) =>
                  onFiltersChange({ ...filters, productionType })
                }
              />
            )}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <p className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-slate-500">
              <CalendarRange size={14} className="shrink-0 text-slate-400" />
              Current snapshot, so no date range is needed.
            </p>
            <RequestButton
              label={report.label}
              busy={busy}
              queued={!!queued}
              disabled={busy}
              onClick={onRequest}
              className="h-11"
            />
          </div>
        )}
        {!isHistory && queuedNote}
      </div>
    </div>
  );
}

/**
 * Reports
 * Request CSV exports. Every report is generated in the background and emailed
 * to the admin who asked for it, so this page confirms what was queued rather
 * than showing results — the API has no way to list or re-download past runs.
 */
export default function Reports() {
  // reportType -> { fromDate, toDate, from, to } for the history reports.
  const [ranges, setRanges] = useState(() =>
    Object.fromEntries(
      REPORTS.filter((r) => r.kind === "history").map((r) => [
        r.type,
        initialRange(),
      ]),
    ),
  );
  // reportType -> { productionType } for reports that take filters. Empty
  // means "all", and is left off the request.
  const [filters, setFilters] = useState({});
  // reportType -> { status: "sending" | "queued" }
  const [states, setStates] = useState({});

  const email = getCurrentUser().email;

  // A new period or filter means the old confirmation no longer describes what
  // the button would send.
  function clearQueued(type) {
    setStates((s) => {
      if (!s[type]) return s;
      const clear = { ...s };
      delete clear[type];
      return clear;
    });
  }

  async function submit(report) {
    const range = ranges[report.type];
    if (report.kind === "history" && rangeProblem(range?.from, range?.to)) {
      return;
    }
    setStates((s) => ({ ...s, [report.type]: { status: "sending" } }));
    try {
      const res = await requestReport({
        reportType: report.type,
        ...(report.kind === "history"
          ? { fromDate: range.fromDate, toDate: range.toDate }
          : {}),
        ...(report.filters?.includes("productionType")
          ? {
              productionType: filters[report.type]?.productionType || undefined,
            }
          : {}),
      });
      const body = res?.data ?? {};
      setStates((s) => ({ ...s, [report.type]: { status: "queued" } }));
      toast.success(
        body.message ||
          `${report.label} is being prepared and will be emailed to you.`,
      );
    } catch (err) {
      setStates((s) => {
        const next = { ...s };
        delete next[report.type];
        return next;
      });
      toast.error(
        err?.response?.data?.message ||
          `Couldn't request the ${report.label} report.`,
      );
    }
  }

  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5">
      <div className="mx-auto max-w-[1400px]">
        {/* How this page works — it emails rather than downloads, which is
            worth saying once up front instead of surprising people. */}
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#BBD0EC] bg-[#EEF3FB] px-4 py-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#1E4D96]">
            <Mail size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1E4D96]">
              Reports arrive by email
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#1E4D96]/80">
              Each report is built in the background and sent as a CSV
              {email ? (
                <>
                  {" "}
                  to <span className="font-semibold">{email}</span>
                </>
              ) : (
                " to your account's email address"
              )}
              . Large periods take longer, but you can keep working in the meantime.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {REPORTS.map((report) => (
            <ReportCard
              key={report.type}
              report={report}
              range={ranges[report.type]}
              state={states[report.type]}
              onRangeChange={(next) => {
                setRanges((r) => ({ ...r, [report.type]: next }));
                clearQueued(report.type);
              }}
              filters={filters[report.type]}
              onFiltersChange={(next) => {
                setFilters((f) => ({ ...f, [report.type]: next }));
                clearQueued(report.type);
              }}
              onRequest={() => submit(report)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
