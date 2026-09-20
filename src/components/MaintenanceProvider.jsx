import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { RefreshCw, Wrench } from "lucide-react";
import GateScreen, { GateLoading } from "./GateScreen";
import { MaintenanceContext } from "../context/maintenance";
import { GetMaintenanceStatus } from "../services/apiServices";
import { clearSession } from "../utils/auth";

const FALLBACK_MESSAGE =
  "The system is temporarily unavailable while we carry out maintenance. Please check back shortly.";

/** "20 Sep 2026, 10:04" — the ISO timestamp the API returns, read as local. */
function formatSince(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `data` out of the response envelope. */
function extractStatus(res) {
  const d = res?.data?.data ?? {};
  return {
    isEnabled: d.isEnabled === true,
    message: d.message || "",
    enabledAt: d.enabledAt || null,
  };
}

/**
 * MaintenanceProvider
 *
 * A layout route sitting directly inside ProtectedRoute, wrapping everything
 * else — the set-password screen included. While maintenance is on, nothing
 * but the notice below renders, which is the whole point: every other endpoint
 * is expected to refuse, so letting a screen through would only produce a
 * page of failed panels.
 *
 * It is checked here rather than only at login so that a tab left open, or a
 * URL typed straight at a page, gets the same answer.
 *
 * Failure is deliberately OPEN: if the status call itself can't be reached,
 * the app renders as normal. Locking everyone out of a working system because
 * one request failed would be the worse mistake — `unavailable` records it so
 * Settings can say the status is unknown rather than claim all is well.
 */
export default function MaintenanceProvider() {
  const navigate = useNavigate();
  const [status, setStatus] = useState({
    isEnabled: false,
    message: "",
    enabledAt: null,
  });
  const [checking, setChecking] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  // Bumped to re-run the check — see `refresh` below.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    GetMaintenanceStatus()
      .then((res) => {
        if (!alive) return;
        setStatus(extractStatus(res));
        setUnavailable(false);
      })
      .catch(() => {
        if (!alive) return;
        // Can't tell — fail open, and remember that we couldn't.
        setStatus({ isEnabled: false, message: "", enabledAt: null });
        setUnavailable(true);
      })
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  // The loading reset belongs here rather than at the top of the effect, where
  // it would be a synchronous setState on every run.
  const refresh = useCallback(() => {
    setChecking(true);
    setReloadKey((k) => k + 1);
  }, []);

  const value = useMemo(
    () => ({ ...status, checking, unavailable, refresh }),
    [status, checking, unavailable, refresh],
  );

  const handleSignOut = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  // First check, before anything else has rendered.
  if (checking && !status.isEnabled) {
    return <GateLoading label="Checking system status…" />;
  }

  if (status.isEnabled) {
    const since = formatSince(status.enabledAt);
    return (
      <GateScreen>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Wrench size={26} />
        </span>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
          Under maintenance
        </h1>
        {/* The admin's own wording where there is one — it will say more about
            what's happening than anything generic written here. */}
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {status.message || FALLBACK_MESSAGE}
        </p>
        {since && (
          <p className="mt-2 text-xs text-slate-400">Started {since}</p>
        )}
        <button
          type="button"
          onClick={refresh}
          disabled={checking}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1E4D96] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3F7A] disabled:opacity-70"
        >
          <RefreshCw size={15} className={checking ? "animate-spin" : ""} />
          {checking ? "Checking…" : "Check again"}
        </button>
        <div>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            Sign out
          </button>
        </div>
      </GateScreen>
    );
  }

  return (
    <MaintenanceContext.Provider value={value}>
      <Outlet />
    </MaintenanceContext.Provider>
  );
}
