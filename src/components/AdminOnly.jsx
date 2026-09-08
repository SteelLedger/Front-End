import { Lock } from "lucide-react";
import { isAdmin } from "../utils/auth";

/**
 * AdminLocked
 * What a non-admin sees in place of an admin-only screen. Hiding the nav item
 * isn't enough on its own — the route is still reachable by typing the URL or
 * following an old link, and a blank page there would read as a bug.
 */
export function AdminLocked({
  title = "This section is admin-only",
  message = "Ask an admin on your team if you need access.",
}) {
  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Lock size={26} />
        </span>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          {message}
        </p>
      </div>
    </div>
  );
}

/**
 * AdminOnly
 * Route wrapper: renders the page for an admin, the locked notice for anyone
 * else. The role is read at render (not at module load), so it reflects
 * whoever is signed in rather than whoever was signed in when the bundle
 * first evaluated.
 */
export default function AdminOnly({ title, message, children }) {
  if (!isAdmin()) return <AdminLocked title={title} message={message} />;
  return children;
}
