import { Building2, Check } from "lucide-react";
import { orgInitials, orgName } from "../utils/organization";

/**
 * OrganizationPicker
 * The list of tenants, with the active one marked. Shared by the sidebar's
 * switch-organization modal and the Settings card so both stay in step — the
 * active row is the one the app is scoped to right now, which on a fresh login
 * is the first organization in the list.
 *
 * Presentational only: the caller owns `activeId` and decides what a pick
 * means (OrganizationProvider.switchOrg, in both current callers).
 */
export default function OrganizationPicker({
  organizations = [],
  activeId,
  onSelect,
  emptyLabel = "No organizations found.",
}) {
  if (!organizations.length) {
    return (
      <p className="px-3 py-6 text-center text-sm text-slate-400">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul role="radiogroup" aria-label="Organization" className="space-y-1">
      {organizations.map((org) => {
        const active = org._id === activeId;
        return (
          <li key={org._id}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect?.(org)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40 ${
                active
                  ? "border-[#1E4D96] bg-[#EEF3FB]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold ${
                  active
                    ? "bg-[#1E4D96] text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {orgInitials(org)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {orgName(org)}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                  <Building2 size={11} />
                  {active ? "Current organization" : "Switch to this"}
                </span>
              </span>
              {active && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1E4D96] text-white">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
