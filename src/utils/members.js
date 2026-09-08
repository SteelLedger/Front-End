// Team-member helpers, matching the /users API contract.
//
// A member is exactly: email + role (admin | user). There's no name field and
// no password — inviting emails a generated temporary password, so the invite
// form is just those two fields. `invitationStatus` flips from pending to
// accepted once the member signs in with that temporary password.

import { formatISODate } from "./dateRange";

// The API's role enum. `value` goes on the wire, `label` on screen.
export const ROLES = [
  {
    value: "admin",
    label: "Admin",
    description: "Full access, including inviting and removing members.",
  },
  {
    value: "user",
    label: "User",
    description: "Day-to-day access. Can't manage members.",
  },
];

export const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "All roles" },
  ...ROLES.map(({ value, label }) => ({ value, label })),
];

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
];

export function roleLabel(value) {
  return ROLES.find((r) => r.value === value)?.label || value || "—";
}

export function statusLabel(value) {
  return value === "accepted"
    ? "Accepted"
    : value === "pending"
      ? "Pending"
      : "—";
}

// Fields GET /users will sort on — anything else has to stay unsorted.
export const SORTABLE_FIELDS = [
  "email",
  "role",
  "invitationStatus",
  "createdAt",
];

/** Good enough to catch typos before the request; the API is the real judge. */
export const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());

/** "2026-08-15T10:04:22.596Z" -> "15 Aug 2026" */
export function formatJoined(timestamp) {
  if (!timestamp) return "—";
  return formatISODate(String(timestamp).slice(0, 10)) || "—";
}

/** A user from the API -> the shape the list renders. */
export function normalizeMember(raw) {
  return {
    id: raw._id ?? raw.id ?? "",
    email: raw.email ?? "",
    role: raw.role ?? "",
    invitationStatus: raw.invitationStatus ?? "",
    createdAt: raw.createdAt ?? "",
  };
}

/** Dig the list and total out of the response envelope. */
export function extractMembers(res) {
  const body = res?.data ?? {};
  const list = Array.isArray(body.data) ? body.data : (body.data?.users ?? []);
  const total =
    body.meta?.pagination?.total ?? (Array.isArray(list) ? list.length : 0);
  return {
    list: Array.isArray(list) ? list : [],
    total: Number(total) || 0,
  };
}

export function emptyMemberForm() {
  return { email: "", role: "user", error: "", errorFields: [] };
}

/** A normalized member -> the drawer form. */
export function memberToForm(m) {
  return {
    email: m.email || "",
    role: m.role || "user",
    error: "",
    errorFields: [],
  };
}

/** Drawer form -> POST/PUT body. */
export function buildMemberPayload(f) {
  return { email: f.email.trim().toLowerCase(), role: f.role };
}
