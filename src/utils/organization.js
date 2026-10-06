/**
 * Multi-tenant helpers.
 *
 * Every tenant API — parties, purchases, productions, inventory, sales,
 * transactions, dashboard, reports, action logs, location — is scoped by an
 * `X-Organization-Id` header carrying the ObjectId of the active organization.
 * Only auth, /users, /organizations, maintenance and health are exempt, which
 * is what makes it possible to fetch the org list before one is chosen.
 *
 * The active organization is stored alongside the session so a refresh lands
 * back in the same tenant; axiosInstance reads it on every request, and
 * OrganizationProvider is what puts it there.
 */

const ORG_ID_KEY = "organizationId";
const ORG_KEY = "organization";

/** ObjectId of the active organization, or "" when none is chosen yet. */
export function getActiveOrgId() {
  return localStorage.getItem(ORG_ID_KEY) || "";
}

/** The active organization ({ _id, name, … }), or null. */
export function getActiveOrg() {
  try {
    const stored = JSON.parse(localStorage.getItem(ORG_KEY));
    return stored && stored._id ? stored : null;
  } catch {
    return null; // malformed JSON reads as "nothing chosen"
  }
}

/** Remember the organization every later request should be scoped to. */
export function setActiveOrg(org) {
  if (!org?._id) return;
  localStorage.setItem(ORG_ID_KEY, org._id);
  localStorage.setItem(
    ORG_KEY,
    JSON.stringify({ _id: org._id, name: org.name || "" }),
  );
}

/** Drop the stored organization. Safe to call repeatedly. */
export function clearActiveOrg() {
  localStorage.removeItem(ORG_ID_KEY);
  localStorage.removeItem(ORG_KEY);
}

/** Display name for an organization, however sparse the record is. */
export function orgName(org) {
  return org?.name?.trim() || "Untitled organization";
}

/** Initials for the org avatar ("Acme Steel Pvt Ltd" -> "AS"). */
export function orgInitials(org) {
  const parts = orgName(org).split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

/**
 * GET /organizations -> { list, total }. The payload nests the array under
 * `data.organizations`; a bare `data` array is tolerated in case that changes.
 */
export function extractOrganizations(res) {
  const body = res?.data ?? {};
  const list = Array.isArray(body.data)
    ? body.data
    : (body.data?.organizations ?? []);
  const total =
    body.meta?.pagination?.total ?? (Array.isArray(list) ? list.length : 0);
  return {
    list: Array.isArray(list) ? list.filter((o) => o?._id) : [],
    total: Number(total) || 0,
  };
}

/**
 * Which organization should be active, given what the API returned and what
 * was stored. The stored one wins while it still exists (it may have been
 * deleted, or belong to a different account); otherwise the first one is the
 * default, which is what a fresh login gets.
 */
export function pickActiveOrg(list, storedId) {
  if (!list.length) return null;
  return list.find((o) => o._id === storedId) || list[0];
}
