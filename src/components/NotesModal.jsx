import { useEffect } from "react";
import { X, StickyNote } from "lucide-react";

/**
 * NotesModal
 * Every note on a party, in one centered dialog. Notes used to sit in a strip
 * across the detail header, which truncated each one to a single line and left
 * no room for more than a couple — this shows them in full.
 */
export default function NotesModal({ open, partyName, notes = [], onClose }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Party notes"
        className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E4D96]">
              <StickyNote size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">Notes</h3>
              <p className="truncate text-xs text-slate-400">
                {partyName || "This party"} ·{" "}
                {notes.length === 1 ? "1 note" : `${notes.length} notes`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-2 rounded-md p-2 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
              <StickyNote size={28} className="mb-2" />
              <p className="text-sm">No notes for this party yet.</p>
              <p className="mt-1 text-xs">
                Add one from the Notes tab when you edit the party.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {notes.map((n, i) => (
                <li
                  key={n._id || i}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-relaxed text-slate-700"
                >
                  {n.content}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
