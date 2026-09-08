// Action-log helpers, matching the admin-only /action-logs API.
//
// An entry records WHO did WHAT to WHICH record — no before/after snapshots.
// The backend drops anything older than 30 days via a MongoDB TTL index, so
// the page says so rather than letting an admin wonder where last quarter went.

export const LOG_RETENTION_DAYS = 30;

/** The API's `action` enum, in the order the filter lists them. */
export const ACTIONS = [
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
  { value: "login", label: "Signed in" },
  { value: "invite", label: "Invited" },
  { value: "resend_invite", label: "Resent invite" },
  { value: "change_password", label: "Changed password" },
  { value: "forgot_password", label: "Forgot password" },
  { value: "verify_otp", label: "Verified OTP" },
  { value: "reset_password", label: "Reset password" },
];

/** The API's `resourceType` enum. */
export const RESOURCES = [
  { value: "auth", label: "Auth" },
  { value: "user", label: "Member" },
  { value: "party", label: "Party" },
  { value: "purchase", label: "Purchase" },
  { value: "sale", label: "Sale" },
  { value: "production", label: "Production" },
  { value: "product", label: "Product" },
  { value: "raw_material", label: "Raw material" },
  { value: "by_product", label: "By-product" },
  { value: "transaction", label: "Transaction" },
];

export const ACTION_FILTER_OPTIONS = [
  { value: "all", label: "All actions" },
  ...ACTIONS,
];

export const RESOURCE_FILTER_OPTIONS = [
  { value: "all", label: "All records" },
  ...RESOURCES,
];

/**
 * Badge colour per action, grouped by what the action does rather than by
 * name: writes are green, edits blue, deletions red, and everything
 * account-related shares one neutral violet so sign-ins don't shout.
 */
const ACTION_TONE = {
  create: "bg-emerald-50 text-emerald-700",
  invite: "bg-emerald-50 text-emerald-700",
  update: "bg-blue-50 text-[#1E4D96]",
  delete: "bg-rose-50 text-rose-700",
};
const AUTH_TONE = "bg-violet-50 text-violet-700";

export const actionTone = (action) => ACTION_TONE[action] ?? AUTH_TONE;

export function actionLabel(value) {
  return (
    ACTIONS.find((a) => a.value === value)?.label ||
    String(value || "").replace(/_/g, " ") ||
    "—"
  );
}

export function resourceLabel(value) {
  return (
    RESOURCES.find((r) => r.value === value)?.label ||
    String(value || "").replace(/_/g, " ") ||
    "—"
  );
}

/** "2026-08-28T14:32:05.000Z" -> { date: "28/08/2026", time: "14:32" } */
export function formatLogTime(timestamp) {
  if (!timestamp) return { date: "—", time: "" };
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return { date: String(timestamp), time: "" };
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** An entry from the API -> the shape the list renders. */
export function normalizeLog(raw) {
  return {
    id: raw._id ?? raw.id ?? "",
    actorId: raw.actorId ?? "",
    actorEmail: raw.actorEmail ?? "",
    actorRole: raw.actorRole ?? "",
    action: raw.action ?? "",
    resourceType: raw.resourceType ?? "",
    resourceId: raw.resourceId ?? "",
    resourceLabel: raw.resourceLabel ?? "",
    message: raw.message ?? "",
    createdAt: raw.createdAt ?? "",
  };
}

/** Dig the list and total out of the envelope — `data` is a flat array here. */
export function extractLogs(res) {
  const body = res?.data ?? {};
  const d = body.data ?? [];
  const list = Array.isArray(d) ? d : (d.logs ?? d.actionLogs ?? []);
  const total =
    body.meta?.pagination?.total ?? (Array.isArray(list) ? list.length : 0);
  return {
    list: Array.isArray(list) ? list : [],
    total: Number(total) || 0,
  };
}
