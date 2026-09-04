import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  Search,
  X,
  Inbox,
  Loader2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import FilterSelect from "../components/FilterSelect";
import { usePageHeader } from "../context/pageHeader";
import { defaultDateRange } from "../utils/dateRange";
import { getInitials } from "../utils/auth";
import {
  ACTION_FILTER_OPTIONS,
  RESOURCE_FILTER_OPTIONS,
  LOG_RETENTION_DAYS,
  actionLabel,
  actionTone,
  resourceLabel,
  formatLogTime,
  normalizeLog,
  extractLogs,
} from "../utils/actionLogs";
import { GetActionLogs } from "../services/apiServices";

const PAGE_SIZE = 20;

/* -------------------------------- pieces ---------------------------------- */

function ActionBadge({ action }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${actionTone(action)}`}
    >
      {actionLabel(action)}
    </span>
  );
}

/** Which record the entry touched: type, plus its name when there is one. */
function ResourceCell({ log }) {
  return (
    <span className="inline-flex min-w-0 flex-col">
      <span className="truncate text-slate-700">
        {resourceLabel(log.resourceType)}
      </span>
      {log.resourceLabel && (
        <span className="truncate text-xs text-slate-400">
          {log.resourceLabel}
        </span>
      )}
    </span>
  );
}

function Actor({ log }) {
  if (!log.actorEmail) return <span className="text-slate-400">—</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
        {getInitials(log.actorEmail)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-slate-700">{log.actorEmail}</span>
        {log.actorRole && (
          <span className="block text-xs capitalize text-slate-400">
            {log.actorRole}
          </span>
        )}
      </span>
    </span>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function ActionLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [action, setAction] = useState("all");
  const [resourceType, setResourceType] = useState("all");
  // Newest first: an audit trail is read from the top down.
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  // { fromDate, toDate } as DD/MM/YYYY — opens on the current month.
  const [dateRange, setDateRange] = useState(defaultDateRange);

  usePageHeader({
    dateFilter: true,
    onDateChange: (range) => {
      setDateRange(range);
      setPage(1);
    },
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtersDirty =
    action !== "all" || resourceType !== "all" || !!query.trim();

  // Debounce the search box (and reset to page 1).
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [query]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const res = await GetActionLogs({
        search: debouncedQuery || undefined,
        action,
        resourceType,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        sortOrder,
        page,
        limit: PAGE_SIZE,
      });
      const { list, total: t } = extractLogs(res);
      setLogs(list.map(normalizeLog));
      setTotal(t);
    } catch (err) {
      setLogs([]);
      setListError(
        err?.response?.status === 403
          ? "Only admins can view the action log."
          : "Couldn't load the action log.",
      );
      toast.error(err?.response?.data?.message || "Failed to load action log");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, action, resourceType, dateRange, sortOrder, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
  }, [fetchLogs]);

  function resetFilters() {
    setAction("all");
    setResourceType("all");
    setQuery("");
    setPage(1);
  }

  return (
    <div className="min-h-full space-y-4 bg-[#F7F8FB] p-4 lg:space-y-5 lg:p-5">
      <div className="mx-auto max-w-[1400px]">
        {/* The TTL is the backend's, not a bug — say so before it's noticed. */}
        <p className="mb-4 flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-500 shadow-sm">
          <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
          Every create, update, delete and sign-in is recorded here. Entries are
          kept for {LOG_RETENTION_DAYS} days, then removed automatically.
        </p>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="flex flex-wrap items-baseline gap-x-3 text-base font-semibold text-slate-900">
              Activity
              <span className="text-xs font-medium text-slate-400">
                {total} {total === 1 ? "entry" : "entries"}
              </span>
            </h2>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <FilterSelect
                label="Action"
                value={action}
                onChange={(v) => {
                  setAction(v);
                  setPage(1);
                }}
                options={ACTION_FILTER_OPTIONS}
                active={action !== "all"}
                width={190}
                compact
              />
              <FilterSelect
                label="Record"
                value={resourceType}
                onChange={(v) => {
                  setResourceType(v);
                  setPage(1);
                }}
                options={RESOURCE_FILTER_OPTIONS}
                active={resourceType !== "all"}
                width={190}
                compact
              />
              <div className="relative w-full sm:w-64">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search person, record or message…"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm transition-colors focus:border-[#1E4D96] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E4D96]/30"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {filtersDirty && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={14} /> Reset
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : listError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-rose-500">
              <p className="text-sm">{listError}</p>
              <button
                type="button"
                onClick={fetchLogs}
                className="mt-2 font-medium text-[#1E4D96] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Inbox size={32} className="mb-2" />
              <p className="text-sm">
                {filtersDirty || dateRange.fromDate
                  ? "No activity matches these filters."
                  : "Nothing has been recorded yet."}
              </p>
            </div>
          ) : (
            <>
              {/* Phones and tablets get rows; the table needs the width. */}
              <div className="divide-y divide-slate-100 xl:hidden">
                {logs.map((log) => {
                  const when = formatLogTime(log.createdAt);
                  return (
                    <div key={log.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <ActionBadge action={log.action} />
                        <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">
                          {when.date} {when.time}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {log.message || "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                        <span className="truncate">
                          {log.actorEmail || "—"}
                        </span>
                        <span>·</span>
                        <span>{resourceLabel(log.resourceType)}</span>
                        {log.resourceLabel && (
                          <>
                            <span>·</span>
                            <span className="truncate">
                              {log.resourceLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={() =>
                            setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
                          }
                          className="inline-flex items-center gap-1 uppercase tracking-wide text-[#1E4D96] transition-colors hover:text-slate-700"
                        >
                          When
                          <span className="inline-flex flex-col -space-y-[5px] leading-none">
                            <ChevronUp
                              size={12}
                              strokeWidth={2.5}
                              className={
                                sortOrder === "asc"
                                  ? "text-[#1E4D96]"
                                  : "text-slate-300"
                              }
                            />
                            <ChevronDown
                              size={12}
                              strokeWidth={2.5}
                              className={
                                sortOrder === "desc"
                                  ? "text-[#1E4D96]"
                                  : "text-slate-300"
                              }
                            />
                          </span>
                        </button>
                      </th>
                      <th className="px-4 py-3 font-semibold">Who</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                      <th className="px-4 py-3 font-semibold">Record</th>
                      <th className="px-4 py-3 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => {
                      const when = formatLogTime(log.createdAt);
                      return (
                        <tr
                          key={log.id}
                          className="align-top hover:bg-slate-50/70"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                            {when.date}
                            <span className="ml-1.5 text-xs text-slate-400">
                              {when.time}
                            </span>
                          </td>
                          <td className="max-w-[16rem] px-4 py-3">
                            <Actor log={log} />
                          </td>
                          <td className="px-4 py-3">
                            <ActionBadge action={log.action} />
                          </td>
                          <td className="max-w-[12rem] px-4 py-3">
                            <ResourceCell log={log} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {log.message || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((n) => Math.max(1, n - 1))}
                      aria-label="Previous page"
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((n) => Math.min(totalPages, n + 1))
                      }
                      aria-label="Next page"
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
