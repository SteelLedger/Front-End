import { useMemo, useState } from "react";
import {
  Activity,
  Building2,
  KeyRound,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import ChangePasswordModal from "../components/ChangePasswordModal";
import OrganizationPicker from "../components/OrganizationPicker";
import { useOrganization } from "../context/organization";
import { useMaintenance } from "../context/maintenance";
import { orgName } from "../utils/organization";
import { getCurrentUser, getDisplayUser } from "../utils/auth";
import { roleLabel } from "../utils/members";

// Past this many, scanning the list gets tedious and a search box earns its
// place. Matches the switcher modal's threshold.
const SEARCH_THRESHOLD = 6;

/* ---------------------------------- page ---------------------------------- */

export default function Settings() {
  const me = getCurrentUser();
  const display = getDisplayUser();
  const [passwordOpen, setPasswordOpen] = useState(false);

  // Same list and same active tenant the sidebar switcher shows — both read
  // OrganizationProvider, so picking here is picking there.
  const { organizations, activeOrg, activeOrgId, switchOrg } =
    useOrganization();
  const [orgQuery, setOrgQuery] = useState("");

  /**
   * Read-only. The app can't be reached at all while maintenance is on — this
   * card is reachable only when it's off (or unknown), so in practice it says
   * "Operational". It exists so the status is visible somewhere rather than
   * being invisible until it locks everyone out.
   */
  const maintenance = useMaintenance();

  // Filtered here rather than re-queried: the whole list is already loaded.
  const visibleOrgs = useMemo(() => {
    const q = orgQuery.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((o) => orgName(o).toLowerCase().includes(q));
  }, [organizations, orgQuery]);

  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5">
      <div className="mx-auto max-w-2xl pb-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E4D96]">
              <UserRound size={19} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">
                Profile
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                How you're signed in. Only an admin can change these.
              </p>
            </div>
          </div>

          <dl className="divide-y divide-slate-100 border-t border-slate-100">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-slate-500">Email</dt>
              <dd className="truncate text-sm font-medium text-slate-800">
                {me.email || display.email || "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-slate-500">Role</dt>
              <dd>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    me.role === "admin"
                      ? "bg-[#EEF3FB] text-[#1E4D96]"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {me.role === "admin" && <ShieldCheck size={12} />}
                  {roleLabel(me.role)}
                </span>
              </dd>
            </div>
            {/* The form itself lives in a modal — this row is just the way in. */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <dt className="text-sm text-slate-500">Password</dt>
                <dd className="mt-0.5 text-xs text-slate-400">
                  Last changed on your account, not shown here.
                </dd>
              </div>
              <button
                type="button"
                onClick={() => setPasswordOpen(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40"
              >
                <KeyRound size={15} className="text-[#1E4D96]" />
                Change Password
              </button>
            </div>
          </dl>
        </div>

        {/* ------------------------------ organization ----------------------------- */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E4D96]">
              <Building2 size={19} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">
                Organization
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Parties, stock, purchases and sales all belong to the
                organization you pick here.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            {organizations.length > SEARCH_THRESHOLD && (
              <div className="relative mb-3">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={orgQuery}
                  onChange={(e) => setOrgQuery(e.target.value)}
                  placeholder="Search organizations"
                  aria-label="Search organizations"
                  className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#1E4D96] focus:outline-none focus:ring-1 focus:ring-[#1E4D96]/30"
                />
              </div>
            )}

            <OrganizationPicker
              organizations={visibleOrgs}
              activeId={activeOrgId}
              onSelect={switchOrg}
              emptyLabel={
                orgQuery
                  ? "No organizations match that."
                  : "No organizations found."
              }
            />

            {organizations.length === 1 && (
              <p className="mt-3 text-xs text-slate-400">
                {orgName(activeOrg)} is the only organization on your account.
              </p>
            )}
          </div>
        </div>

        {/* ------------------------------ system status ----------------------------- */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E4D96]">
              <Activity size={19} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">
                System Status
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Whether the system is up or down for maintenance. Read-only.
                Only an administrator can change it.
              </p>
            </div>
          </div>

          <dl className="divide-y divide-slate-100 border-t border-slate-100">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-slate-500">Status</dt>
              <dd>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    maintenance.isEnabled
                      ? "bg-amber-50 text-amber-700"
                      : maintenance.unavailable
                        ? "bg-slate-100 text-slate-600"
                        : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      maintenance.isEnabled
                        ? "bg-amber-500"
                        : maintenance.unavailable
                          ? "bg-slate-400"
                          : "bg-emerald-500"
                    }`}
                  />
                  {maintenance.isEnabled
                    ? "Under maintenance"
                    : maintenance.unavailable
                      ? "Unknown"
                      : "Operational"}
                </span>
              </dd>
            </div>
            {/* The API's `message` is null unless maintenance is on. */}
            {maintenance.message && (
              <div className="flex items-start justify-between gap-4 py-3">
                <dt className="shrink-0 text-sm text-slate-500">Notice</dt>
                <dd className="text-right text-sm text-slate-700">
                  {maintenance.message}
                </dd>
              </div>
            )}
            {maintenance.unavailable && (
              <div className="py-3">
                <dd className="text-xs text-slate-400">
                  The status check couldn't be reached, so this is the last
                  thing we know. The app is left running rather than blocked.
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </div>
  );
}
