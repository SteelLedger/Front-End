import { useEffect, useMemo, useState } from "react";
import { Building2, Search, X } from "lucide-react";
import OrganizationPicker from "./OrganizationPicker";
import { useOrganization } from "../context/organization";
import { orgName } from "../utils/organization";

// Below this the list is short enough to read at a glance; the search box
// would just be another thing in the way.
const SEARCH_THRESHOLD = 6;

/**
 * OrganizationSwitcherModal
 * Reached from the sidebar user menu. Picking a tenant hands off to
 * OrganizationProvider.switchOrg, which stores it, toasts, and returns to the
 * dashboard — so this only has to close itself.
 *
 * The wrapper exists so the dialog below is mounted only while it's open: the
 * search box then starts empty every time, without an effect resetting it.
 */
export default function OrganizationSwitcherModal({ open, onClose }) {
  if (!open) return null;
  return <SwitcherDialog onClose={onClose} />;
}

function SwitcherDialog({ onClose }) {
  const { organizations, activeOrgId, switchOrg } = useOrganization();
  const [query, setQuery] = useState("");

  // Close on Escape, and freeze the page behind the dialog.
  useEffect(() => {
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
  }, [onClose]);

  // Filtered client-side: the whole list is already loaded (limit 100), so a
  // round trip per keystroke would buy nothing.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((o) => orgName(o).toLowerCase().includes(q));
  }, [organizations, query]);

  const handleSelect = (org) => {
    switchOrg(org);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Switch organization"
        className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E4D96]">
              <Building2 size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">
                Switch organization
              </h3>
              <p className="truncate text-xs text-slate-400">
                Everything in the app is scoped to the one you pick.
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

        {organizations.length > SEARCH_THRESHOLD && (
          <div className="border-b border-slate-100 px-5 py-3">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search organizations"
                aria-label="Search organizations"
                className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#1E4D96] focus:outline-none focus:ring-1 focus:ring-[#1E4D96]/30"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <OrganizationPicker
            organizations={filtered}
            activeId={activeOrgId}
            onSelect={handleSelect}
            emptyLabel={
              query ? "No organizations match that." : "No organizations found."
            }
          />
        </div>
      </div>
    </div>
  );
}
