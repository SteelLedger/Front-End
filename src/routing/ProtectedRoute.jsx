import { useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CLOCK_SKEW_MS,
  clearSession,
  getTokenExpiry,
  isTokenExpired,
} from "../utils/auth";

const EXPIRED_MESSAGE = "Your session has expired. Please sign in again.";
// setTimeout silently overflows past this and fires immediately, which would
// log the user out on the spot. Longer-lived tokens just get checked on the
// next mount instead.
const MAX_TIMEOUT = 2147483647;

/**
 * ProtectedRoute
 * Gates the app on a valid session: no token, or an expired one, sends the
 * user to /login. While a token is still good, an automatic logout is armed
 * for the moment it expires, so a tab left open doesn't sit on a dead session.
 * Expiry mid-request is caught separately by the 401 response interceptor.
 */
const ProtectedRoute = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const expired = isTokenExpired(token);

  // Arrived with a token that's already dead — bin it and say why.
  useEffect(() => {
    if (!expired || !token) return;
    clearSession();
    toast.info(EXPIRED_MESSAGE, { toastId: "session-expired" });
  }, [expired, token]);

  // Still valid — log out the moment it expires.
  useEffect(() => {
    if (expired) return;
    const expiresAt = getTokenExpiry(token);
    if (expiresAt == null) return; // no exp claim, nothing to schedule
    // Fire on the same skew-adjusted deadline isTokenExpired() uses.
    const msLeft = expiresAt - CLOCK_SKEW_MS - Date.now();
    if (msLeft <= 0 || msLeft > MAX_TIMEOUT) return;

    const id = setTimeout(() => {
      clearSession();
      toast.info(EXPIRED_MESSAGE, { toastId: "session-expired" });
      navigate("/login", { replace: true });
    }, msLeft);
    return () => clearTimeout(id);
  }, [expired, token, navigate]);

  if (expired) return <Navigate to="/login" replace />;

  return <Outlet />;
};

export default ProtectedRoute;
