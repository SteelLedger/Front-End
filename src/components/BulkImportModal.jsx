import { useEffect, useRef, useState } from "react";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { importParties } from "../services/apiServices";

// The backend's own limit — checked here too so a 6000-row file is refused
// before it is uploaded rather than after.
const MAX_ROWS = 5000;
const SAMPLE_URL = "/parties-import-example.csv";

const RULES = [
  "First row must be the header.",
  `Max ${MAX_ROWS.toLocaleString("en-IN")} data rows per file.`,
  "Duplicate name + partyType (case-insensitive) rows are skipped.",
  "Leave optional cells empty; don't omit columns from the header if you use the full template.",
];

/** "1.4 MB" / "812 B" — file sizes read better than a raw byte count. */
function fileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isCsv = (file) =>
  /\.csv$/i.test(file.name) ||
  ["text/csv", "application/vnd.ms-excel"].includes(file.type);

/**
 * Count data rows without parsing the CSV: quoted fields can hold newlines, so
 * this is a floor, not a precise count. It exists to catch a wildly oversized
 * file early — the backend remains the authority on the limit.
 */
async function countDataRows(file) {
  const text = await file.text();
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim() !== "");
  return Math.max(0, lines.length - 1);
}

/**
 * BulkImportModal
 * Upload a CSV of parties. The import runs asynchronously on the backend, so a
 * successful submit reports a queued job and the email it will land in — this
 * never shows per-row results, because there are none yet.
 *
 * Rendered only while open, so each open is a fresh mount and no file or
 * success panel carries over from last time.
 */
export default function BulkImportModal({ onClose, onQueued }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [queued, setQueued] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, saving]);

  async function pick(next) {
    setQueued(null);
    if (!next) return;
    if (!isCsv(next)) {
      setFile(null);
      setError("That isn't a CSV file. Export or save your sheet as .csv.");
      return;
    }
    if (next.size === 0) {
      setFile(null);
      setError("That file is empty.");
      return;
    }
    setFile(next);
    setError("");
    try {
      const rows = await countDataRows(next);
      if (rows === 0) {
        setError("That file has a header but no data rows.");
      } else if (rows > MAX_ROWS) {
        setError(
          `That file has about ${rows.toLocaleString("en-IN")} data rows — the limit is ${MAX_ROWS.toLocaleString("en-IN")}. Split it and import in parts.`,
        );
      }
    } catch {
      // Unreadable here is not necessarily unreadable server-side; let it try.
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (saving) return;
    pick(e.dataTransfer.files?.[0]);
  }

  async function submit() {
    if (!file || error || saving) return;
    setSaving(true);
    try {
      const res = await importParties(file);
      const body = res?.data ?? {};
      setQueued({
        message: body.message || "Import queued.",
        job: body.data ?? {},
      });
      onQueued?.();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Couldn't start the import. Check the file and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const job = queued?.job ?? {};

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={() => !saving && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bulk import parties"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Bulk Import Parties
            </h3>
            <p className="text-xs text-slate-400">
              Upload a CSV to add many parties at once
            </p>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            aria-label="Close"
            className="-m-2 rounded-md p-2 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {queued ? (
            <div className="py-2 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={24} />
              </span>
              <p className="text-sm font-semibold text-slate-900">
                {queued.message}
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-xs text-slate-500">
                {job.totalRows != null && (
                  <>
                    {Number(job.totalRows).toLocaleString("en-IN")} rows are
                    being processed.{" "}
                  </>
                )}
                They won't appear in the list straight away
                {job.recipientEmail ? (
                  <>
                    {" "}
                    — a summary goes to{" "}
                    <span className="font-medium text-slate-700">
                      {job.recipientEmail}
                    </span>{" "}
                    when it finishes.
                  </>
                ) : (
                  " — you'll get a summary email when it finishes."
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors ${
                  dragging
                    ? "border-[#1E4D96] bg-[#EEF3FB]"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => pick(e.target.files?.[0])}
                />
                <UploadCloud size={26} className="mb-2 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">
                  Drop your CSV here, or click to browse
                </span>
                <span className="mt-0.5 text-xs text-slate-400">
                  .csv files only
                </span>
              </label>

              {file && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
                  <FileSpreadsheet
                    size={18}
                    className="shrink-0 text-emerald-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {fileSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setError("");
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                    aria-label="Remove file"
                    title="Remove file"
                    className="-m-1 rounded-md p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}

              {error && (
                <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                  {error}
                </p>
              )}

              <div className="mt-4 rounded-lg bg-slate-50 px-3.5 py-3">
                <p className="mb-1.5 text-xs font-semibold text-slate-700">
                  Rules to remember
                </p>
                <ul className="space-y-1 text-xs text-slate-500">
                  {RULES.map((rule) => (
                    <li key={rule} className="flex gap-1.5">
                      <span className="text-slate-300">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href={SAMPLE_URL}
                download
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E4D96] hover:underline"
              >
                <Download size={14} /> Download sample CSV
              </a>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            {queued ? "Done" : "Cancel"}
          </button>
          {!queued && (
            <button
              type="button"
              onClick={submit}
              disabled={!file || !!error || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1E4D96] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? "Uploading…" : "Import"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
