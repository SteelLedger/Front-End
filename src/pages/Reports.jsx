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
} from "lucide-react";
import PeriodPicker from "../components/PeriodPicker";
import InfoTip from "../components/InfoTip";
import { requestReport } from "../services/apiServices";
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
 * ReportCard
 * One report: what it contains, how it is scoped, and a button to queue it.
 * History reports carry the app's usual period chips; inventory reports have
 * nothing to configure, so they say so rather than showing a disabled control.
 */
function ReportCard({ report, range, onRangeChange, onRequest, state }) {
  const Icon = ICONS[report.icon] ?? FileSpreadsheet;
  const isHistory = report.kind === "history";
  const problem = isHistory ? rangeProblem(range?.from, range?.to) : "";
  const busy = state?.status === "sending";
  const queued = state?.status === "queued" ? state : null;

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
            <PeriodPicker
              value={range}
              onChange={onRangeChange}
              min={earliestISO()}
            />
            {problem && (
              <p className="mt-2 text-xs font-medium text-rose-600">
                {problem}
              </p>
            )}
          </>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarRange size={14} className="shrink-0 text-slate-400" />
            Current snapshot — no date range needed.
          </p>
        )}
      </div>

      {/* Action */}
      <div className="mt-4 flex items-center justify-between gap-3">
        {queued ? (
          <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={14} className="shrink-0" />
            <span className="truncate">Queued — check your email</span>
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onRequest}
          disabled={busy || !!problem}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#1E4D96] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          {busy ? "Requesting…" : queued ? "Request again" : "Request CSV"}
        </button>
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
  // reportType -> { status: "sending" | "queued" }
  const [states, setStates] = useState({});

  const email = getCurrentUser().email;

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
              . Large periods take longer — you can keep working meanwhile.
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
                // A new period means the old confirmation no longer describes
                // what this button would send.
                setStates((s) => {
                  if (!s[report.type]) return s;
                  const clear = { ...s };
                  delete clear[report.type];
                  return clear;
                });
              }}
              onRequest={() => submit(report)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
