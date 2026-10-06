import axios from "axios";
import { clearSession } from "../utils/auth";
import { getActiveOrgId } from "../utils/organization";
import { reportServiceUnavailable } from "../utils/maintenance";

// === Create Axios instance ===
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },

  timeout: 180000,
});

/**
 * Routes that are NOT scoped to one organization, and so must not carry the
 * tenant header: signing in, changing your own password, team members
 * (accounts are account-wide, not per-tenant), the organization endpoints
 * themselves — which is how the org list can be fetched before one is
 * picked — plus maintenance and health.
 */
const ORG_EXEMPT = [
  "/auth/",
  "/users",
  "/organizations",
  "/maintenance",
  "/health",
];

const isOrgExempt = (url = "") => {
  // Compare against the path only: a query string can contain anything.
  const path = url.split("?")[0];
  return ORG_EXEMPT.some((p) => path === p || path.startsWith(p));
};

/**
 * Attach the auth token (saved at login) and the active organization to every
 * request. Tenant APIs answer 400 without `X-Organization-Id`, so
 * OrganizationProvider resolves one before any page is allowed to render —
 * see utils/organization.
 */
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const orgId = getActiveOrgId();
  if (orgId && !isOrgExempt(config.url)) {
    config.headers["X-Organization-Id"] = orgId;
  }
  return config;
});

const isMaintenanceCall = (url = "") =>
  url.split("?")[0].startsWith("/maintenance");

// On an expired / invalid session, clear creds and bounce to login.
// On a 503 (maintenance mode), hand over to the maintenance notice.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      clearSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    // MaintenanceProvider handles its own status call's failure itself, so
    // that one is left to reject normally.
    if (status === 503 && !isMaintenanceCall(error.config?.url)) {
      // When the notice is taking over, the request never settles: the screen
      // that made it is being unmounted, and rejecting would only flash its
      // "Couldn't load…" toasts on top of the notice. Nobody listening (the
      // signed-out pages) -> reject as usual so the form shows the message.
      if (reportServiceUnavailable()) return new Promise(() => {});
    }
    return Promise.reject(error);
  },
);

// === Helpers ===
export const POST = (url, data) => axiosInstance.post(url, data);
export const GET = (url, params) => axiosInstance.get(url, { params });
export const PUT = (url, data) => axiosInstance.put(url, data);
export const DELETE = (url, config) => axiosInstance.delete(url, config);
/**
 * Multipart upload of a FormData body.
 *
 * The Content-Type override is load-bearing, not decoration. This instance
 * defaults every request to `application/json`, and axios's own
 * `transformRequest` reads that header BEFORE the adapter runs: seeing JSON, it
 * converts FormData into a JSON object, which turns an attached File into `{}`
 * and posts `{"file":{}}` with no file at all. Naming any non-JSON type here
 * keeps the FormData intact; the browser adapter then strips this header again
 * so the real multipart boundary is generated.
 */
export const UPLOAD = (url, formData) =>
  axiosInstance.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export default axiosInstance;
