import { useState } from "react";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { getCurrentUser, getDisplayUser } from "../utils/auth";
import { roleLabel } from "../utils/members";

/* ---------------------------------- page ---------------------------------- */

export default function Settings() {
  const me = getCurrentUser();
  const display = getDisplayUser();
  const [passwordOpen, setPasswordOpen] = useState(false);

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
      </div>

      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </div>
  );
}
