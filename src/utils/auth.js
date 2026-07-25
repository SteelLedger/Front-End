// Decode a JWT payload (no verification — just to read claims like email/role).
export function decodeToken(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// When the token stops being valid, in ms since epoch — or null if the token
// carries no `exp` claim (JWT `exp` is in seconds).
export function getTokenExpiry(token) {
  const exp = decodeToken(token)?.exp;
  return typeof exp === "number" ? exp * 1000 : null;
}

// Treat a token as dead slightly before its real expiry, so a browser clock
// running fast doesn't let a doomed request through.
export const CLOCK_SKEW_MS = 5000;

/**
 * Has the token expired?
 * A token with no `exp` claim is treated as NOT expired — we can't tell from
 * here, so let the API be the judge (the 401 interceptor still catches it).
 */
export function isTokenExpired(token, skewMs = CLOCK_SKEW_MS) {
  if (!token) return true;
  const expiresAt = getTokenExpiry(token);
  if (expiresAt == null) return false;
  return Date.now() >= expiresAt - skewMs;
}

// Drop the stored session. Safe to call repeatedly.
export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// Initials from a name ("Raj Kumar" -> "RK") or email ("admin@x.com" -> "AD").
export function getInitials(value) {
  if (!value) return "U";
  const base = value.includes("@") ? value.split("@")[0] : value;
  const parts = base.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

// Best display name from a stored user object + token claims.
export function getDisplayUser() {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem("user"));
  } catch {
    // ignore malformed user JSON
  }
  const claims = decodeToken(localStorage.getItem("token")) || {};
  const user = { ...claims, ...(stored || {}) };
  const email = user.email || "";
  const name = user.name || user.fullName || email || "User";
  const role = user.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "";
  return { name, email, role, initials: getInitials(name) };
}
