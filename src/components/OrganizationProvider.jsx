import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AlertTriangle, Building2, RefreshCw } from "lucide-react";
import GateScreen, { GateLoading } from "./GateScreen";
import { OrganizationContext } from "../context/organization";
import { GetOrganizations } from "../services/apiServices";
import { clearSession } from "../utils/auth";
import {
  extractOrganizations,
  getActiveOrgId,
  orgName,
  pickActiveOrg,
  setActiveOrg,
} from "../utils/organization";

// The API's maximum page size. The switcher wants every organization at once,
// not a page of them — nobody scrolls a paginated tenant list.
const ORG_PAGE_LIMIT = 100;

/* ------------------------------ gate screens ------------------------------ */

function SignOutLink({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
    >
      Sign out
    </button>
  );
}

/**
 * OrganizationProvider
 *
 * A layout route sitting between ProtectedRoute and Layout. Tenant APIs answer
 * 400 without an `X-Organization-Id` header, so this loads the organization
 * list once the session is known good and holds the app on a loading screen
 * until one is active — first the one stored from last time, otherwise the
 * first in the list, which is what a fresh login gets.
 *
 * Gating rather than rendering optimistically is deliberate: letting Layout
 * through early would fire a dozen unscoped requests (the sales badge, the
 * dashboard's four panels) that would all 400 before the header existed.
 */
export default function OrganizationProvider() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(getActiveOrgId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Bumping this re-runs the fetch — see `refresh` below.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // StrictMode mounts effects twice in development, and a slow first request
    // can land after the second one; this drops the stale answer.
    let alive = true;

    GetOrganizations({
      limit: ORG_PAGE_LIMIT,
      sortBy: "name",
      sortOrder: "asc",
    })
      .then((res) => {
        if (!alive) return;
        const { list } = extractOrganizations(res);
        setOrganizations(list);

        // Keep the organization stored from last time while it still exists;
        // otherwise fall back to the first, which is what a fresh login gets.
        // Writing it straight back re-syncs storage when the stored one is gone.
        const next = pickActiveOrg(list, getActiveOrgId());
        if (next) {
          setActiveOrg(next);
          setActiveOrgId(next._id);
        }
      })
      .catch((err) => {
        if (!alive) return;
        // A 401 is already handled by the response interceptor, which clears
        // the session and bounces to /login — nothing useful to show here.
        if (err?.response?.status === 401) return;
        setError(
          err?.response?.data?.message ||
            "Couldn't load your organizations. Check your connection and try again.",
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [reloadKey]);

  // Retry. The loading/error reset belongs here rather than at the top of the
  // effect, where it would be a synchronous setState on every run.
  const refresh = useCallback(() => {
    setLoading(true);
    setError("");
    setReloadKey((k) => k + 1);
  }, []);

  /**
   * Switch tenants. Every page's data belongs to the old organization, so this
   * heads back to the dashboard; Layout keys its <Outlet/> on the org id, so
   * whatever renders there reloads against the new one. Detail routes
   * (/inventory/:id) point at records the new tenant doesn't have, which is
   * the other reason not to stay put.
   */
  const switchOrg = useCallback(
    (org) => {
      if (!org?._id || org._id === activeOrgId) return;
      setActiveOrg(org);
      setActiveOrgId(org._id);
      toast.success(`Switched to ${orgName(org)}`);
      navigate("/dashboard", { replace: true });
    },
    [activeOrgId, navigate],
  );

  const activeOrg = useMemo(
    () => organizations.find((o) => o._id === activeOrgId) || null,
    [organizations, activeOrgId],
  );

  const value = useMemo(
    () => ({ organizations, activeOrg, activeOrgId, switchOrg, refresh }),
    [organizations, activeOrg, activeOrgId, switchOrg, refresh],
  );

  const handleSignOut = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return <GateLoading label="Loading your organizations…" />;
  }

  if (error) {
    return (
      <GateScreen>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <AlertTriangle size={22} />
        </span>
        <h1 className="mt-4 text-base font-semibold text-slate-900">
          Couldn't load organizations
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1E4D96] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A]"
        >
          <RefreshCw size={15} />
          Try again
        </button>
        <div>
          <SignOutLink onClick={handleSignOut} />
        </div>
      </GateScreen>
    );
  }

  // Signed in, but the account has nothing to work in. There's no page that
  // could render without a tenant, so say so instead of failing per-panel.
  if (!activeOrgId) {
    return (
      <GateScreen>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#1E4D96]">
          <Building2 size={22} />
        </span>
        <h1 className="mt-4 text-base font-semibold text-slate-900">
          No organization yet
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Your account isn't part of an organization. Ask an admin on your team
          to add you to one.
        </p>
        <button
          type="button"
          onClick={refresh}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1E4D96] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A]"
        >
          <RefreshCw size={15} />
          Check again
        </button>
        <div>
          <SignOutLink onClick={handleSignOut} />
        </div>
      </GateScreen>
    );
  }

  return (
    <OrganizationContext.Provider value={value}>
      <Outlet />
    </OrganizationContext.Provider>
  );
}
