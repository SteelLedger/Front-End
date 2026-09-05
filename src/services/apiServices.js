import { POST, GET, PUT, DELETE, UPLOAD } from "./axiosInstance";

export const login = (data) => {
  return POST(`/auth/login`, data);
};

// { currentPassword, newPassword } for whoever the token belongs to. 400s if
// the current password is wrong or the new one matches the old.
export const changePassword = (data) => {
  return PUT(`/auth/change-password`, data);
};

/* --------------------------- Password reset flow --------------------------- */
// Three unauthenticated steps: email -> OTP -> new password.

// { email }. Emails a 6-digit OTP valid for 10 minutes; 404 if no such user.
export const forgotPassword = (data) => {
  return POST(`/auth/forgot-password`, data);
};

// { email, otp } -> { resetToken } valid for 15 minutes. 400 on a wrong,
// expired, or too-often-retried code.
export const verifyOtp = (data) => {
  return POST(`/auth/verify-otp`, data);
};

// { email, resetToken, newPassword }.
export const resetPassword = (data) => {
  return POST(`/auth/reset-password`, data);
};

/* ------------------------------- Action logs ------------------------------- */

/**
 * Audit trail of who did what. Admin-only — a non-admin token gets 403 — and
 * the backend expires entries after 30 days via a TTL index. `action` and
 * `resourceType` accept "all", which is sent as no filter at all. Sorting is
 * newest-first by default; only the direction is adjustable.
 */
export const GetActionLogs = ({
  search,
  actorId,
  action,
  resourceType,
  fromDate,
  toDate,
  sortOrder,
  page,
  limit,
} = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.append("search", search);
  if (actorId) qs.append("actorId", actorId);
  if (action && action !== "all") qs.append("action", action);
  if (resourceType && resourceType !== "all")
    qs.append("resourceType", resourceType);
  // Inclusive DD/MM/YYYY range.
  if (fromDate) qs.append("fromDate", fromDate);
  if (toDate) qs.append("toDate", toDate);
  if (sortOrder) qs.append("sortOrder", sortOrder);
  if (page) qs.append("page", page);
  if (limit) qs.append("limit", limit);
  const q = qs.toString();
  return GET(`/action-logs${q ? `?${q}` : ""}`);
};

/* ---------------------------- Users / members ------------------------------ */

/**
 * Team members. Every /users endpoint is admin-only — a non-admin token gets
 * 403 — so gate the UI on the caller's role before hitting these.
 * `role` is admin|user, `invitationStatus` is pending|accepted; both accept
 * "all", which is sent as no filter at all.
 */
export const GetUsers = ({
  search,
  role,
  invitationStatus,
  sortBy,
  sortOrder,
  page,
  limit,
} = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.append("search", search);
  if (role && role !== "all") qs.append("role", role);
  if (invitationStatus && invitationStatus !== "all")
    qs.append("invitationStatus", invitationStatus);
  if (sortBy) qs.append("sortBy", sortBy);
  if (sortOrder) qs.append("sortOrder", sortOrder);
  if (page) qs.append("page", page);
  if (limit) qs.append("limit", limit);
  const q = qs.toString();
  return GET(`/users${q ? `?${q}` : ""}`);
};

// Invite a member: { email, role }. The backend generates a temporary password
// and emails it, so there's no password field on this side.
export const inviteUser = (data) => {
  return POST(`/users`, data);
};

// Email and/or role. The API refuses to change your own role or demote the
// last admin — both come back as a 400 with a message worth surfacing.
export const updateUser = (id, data) => {
  return PUT(`/users/${id}`, data);
};

// Soft delete. Refused for yourself and for the last admin.
export const DeleteUser = (id) => {
  return DELETE(`/users/${id}`);
};

// New temporary password, re-emailed. Only valid while the invite is pending.
export const resendUserInvite = (id) => {
  return POST(`/users/${id}/resend-invite`);
};

export const GetAllCountryList = () => {
  return GET(`/location/countries`);
};
export const GetAllStateListByCountryId = (countryId) => {
  return GET(`/location/countries/${countryId}/states`);
};

/**
 * Parties list query. `filter` is an array whose values are repeated in the
 * query string (e.g. ?filter=active&filter=to_receive), matching the backend.
 */
export const GetParties = ({
  search,
  filter,
  fromDate,
  toDate,
  sortBy,
  sortOrder,
  page,
  limit,
} = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.append("search", search);
  if (Array.isArray(filter)) {
    filter.forEach((f) => f && f !== "all" && qs.append("filter", f));
  }
  // Inclusive DD/MM/YYYY range over the party's createdAt.
  if (fromDate) qs.append("fromDate", fromDate);
  if (toDate) qs.append("toDate", toDate);
  if (sortBy) qs.append("sortBy", sortBy);
  if (sortOrder) qs.append("sortOrder", sortOrder);
  if (page) qs.append("page", page);
  if (limit) qs.append("limit", limit);
  const q = qs.toString();
  return GET(`/parties${q ? `?${q}` : ""}`);
};

export const getPartyById = (id) => {
  return GET(`/parties/${id}`);
};

export const createParty = (data) => {
  return POST(`/parties`, data);
};

export const updateParty = (id, data) => {
  return PUT(`/parties/${id}`, data);
};

export const DeleteParty = (deleteId) => {
  return DELETE(`/parties/${deleteId}`);
};

/**
 * Bulk-import parties from a CSV. Takes the raw File and answers 202 — the
 * rows are processed asynchronously off a queue, and the backend emails the
 * caller a summary when it finishes, so the response describes a *job*
 * (status, totalRows, recipientEmail), not the parties themselves.
 * Rows duplicating an existing name + partyType are skipped; 5000 rows max.
 */
export const importParties = (file) => {
  const body = new FormData();
  body.append("file", file);
  return UPLOAD(`/parties/import`, body);
};

/* ------------------------------- Transactions ------------------------------ */

/**
 * A party's ledger — sales, purchases and opening balances. `type` takes one
 * value or several, repeated in the query string (?type=sale&type=purchase)
 * and snake_case as the backend spells them; omit it for every type.
 * `fromDate` / `toDate` are the usual inclusive DD/MM/YYYY pair.
 */
export const GetTransactions = ({
  partyId,
  type,
  fromDate,
  toDate,
  page,
  limit,
} = {}) => {
  const qs = new URLSearchParams();
  if (partyId) qs.append("partyId", partyId);
  const types = Array.isArray(type) ? type : type ? [type] : [];
  types.forEach((t) => t && t !== "all" && qs.append("type", t));
  if (fromDate) qs.append("fromDate", fromDate);
  if (toDate) qs.append("toDate", toDate);
  if (page) qs.append("page", page);
  if (limit) qs.append("limit", limit);
  const q = qs.toString();
  return GET(`/transactions${q ? `?${q}` : ""}`);
};

/* -------------------------------- Purchases -------------------------------- */

export const GetPurchases = ({
  search,
  rawMaterialId,
  fromDate,
  toDate,
  sortBy,
  sortOrder,
  page,
  limit,
} = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.append("search", search);
  // Narrows the list to one raw-material inventory row.
  if (rawMaterialId) qs.append("rawMaterialId", rawMaterialId);
  // Inclusive DD/MM/YYYY range over the purchase date.
  if (fromDate) qs.append("fromDate", fromDate);
  if (toDate) qs.append("toDate", toDate);
  if (sortBy) qs.append("sortBy", sortBy);
  if (sortOrder) qs.append("sortOrder", sortOrder);
  if (page) qs.append("page", page);
  if (limit) qs.append("limit", limit);
  const q = qs.toString();
  return GET(`/purchases${q ? `?${q}` : ""}`);
};

export const createPurchase = (data) => {
  return POST(`/purchases`, data);
};

export const updatePurchase = (id, data) => {
  return PUT(`/purchases/${id}`, data);
};

export const DeletePurchase = (id) => {
  return DELETE(`/purchases/${id}`);
};

/* ------------------------------ Raw materials ------------------------------ */

// Aggregated raw-material inventory (stock by size/point/grade).
// `status` is in_stock|out_of_stock and accepts "all", which is sent as no
// filter at all — same convention as /products and /by-products.
export const GetRawMaterials = ({
  search,
  status,
  sortBy,
  sortOrder,
  page,
  limit,
} = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.append("search", search);
  if (status && status !== "all") qs.append("status", status);
  if (sortBy) qs.append("sortBy", sortBy);
  if (sortOrder) qs.append("sortOrder", sortOrder);
  if (page) qs.append("page", page);
  if (limit) qs.append("limit", limit);
  const q = qs.toString();
  return GET(`/raw-materials${q ? `?${q}` : ""}`);
};

/**
 * Inbound stock history for one raw-material row, from the durable
 * stock_movements collection. Replaces reading balance-patta entries off
 * GET /purchases, which stopped returning them on 2026-08-28. Entries carry
 * `entryType: "purchase" | "balance_patta"`.
 */
export const GetRawMaterialInboundHistory = (
  id,
  { fromDate, toDate, sortOrder, page, limit } = {},
) => {
  const qs = new URLSearchParams();
  if (fromDate) qs.append("fromDate", fromDate);
  if (toDate) qs.append("toDate", toDate);
  if (sortOrder) qs.append("sortOrder", sortOrder);
  if (page) qs.append("page", page);
  if (limit) qs.append("limit", limit);
  const q = qs.toString();
  return GET(`/raw-materials/${id}/inbound-history${q ? `?${q}` : ""}`);
};

/* ------------------------------- Productions ------------------------------- */

export const GetProductions = ({
  search,
  productId,
  fromDate,
  toDate,
  sortBy,
  sortOrder,
  page,
  limit,
} = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.append("search", search);
  // Narrows the list to the runs that made one product inventory row.
  if (productId) qs.append("productId", productId);
  // Inclusive DD/MM/YYYY range over the production date.
  if (fromDate) qs.append("fromDate", fromDate);
  if (toDate) qs.append("toDate", toDate);
  if (sortBy) qs.append("sortBy", sortBy);
  if (sortOrder) qs.append("sortOrder", sortOrder);
  if (page) qs.append("page", page);
  if (limit) qs.append("limit", limit);
  const q = qs.toString();
  return GET(`/productions${q ? `?${q}` : ""}`);
};

export const getProductionById = (id) => {
  return GET(`/productions/${id}`);
};

export const createProduction = (data) => {
  return POST(`/productions`, data);
};

export const updateProduction = (id, data) => {
  return PUT(`/productions/${id}`, data);
};

export const DeleteProduction = (id) => {
  return DELETE(`/productions/${id}`);
};

/* ---------------------------------- Sales ---------------------------------- */

/**
 * Sales list. `fromDate` / `toDate` are DD/MM/YYYY; `paymentType` is one of
 * all | cash | credit | cheque | upi | bank_transfer; `sortBy` is one of
 * date | invoiceNumber | paymentType | createdAt.
 */
export const GetSales = ({
  search,
  paymentType,
  fromDate,
  toDate,
  sortBy,
  sortOrder,
  page,
  limit,
} = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.append("search", search);
  if (paymentType && paymentType !== "all")
    qs.append("paymentType", paymentType);
  if (fromDate) qs.append("fromDate", fromDate);
  if (toDate) qs.append("toDate", toDate);
  if (sortBy) qs.append("sortBy", sortBy);
  if (sortOrder) qs.append("sortOrder", sortOrder);
  if (page) qs.append("page", page);
  if (limit) qs.append("limit", limit);
  const q = qs.toString();
  return GET(`/sales${q ? `?${q}` : ""}`);
};

export const getSaleById = (id) => {
  return GET(`/sales/${id}`);
};

export const createSale = (data) => {
  return POST(`/sales`, data);
};

export const updateSale = (id, data) => {
  return PUT(`/sales/${id}`, data);
};

export const DeleteSale = (id) => {
  return DELETE(`/sales/${id}`);
};

/* -------------------------------- Dashboard -------------------------------- */

/**
 * Every dated dashboard endpoint takes the same optional `fromDate`/`toDate`
 * pair (DD/MM/YYYY). Omitting both lets the backend pick its own default —
 * the current Asia/Kolkata month for summary/top-products, the last 6 months
 * for material-flow.
 */
const dateRangeQuery = ({ fromDate, toDate } = {}) => {
  const qs = new URLSearchParams();
  if (fromDate) qs.append("fromDate", fromDate);
  if (toDate) qs.append("toDate", toDate);
  const q = qs.toString();
  return q ? `?${q}` : "";
};

// Headline quantities and counts for the period.
export const GetDashboardSummary = (range) => {
  return GET(`/dashboard/summary${dateRangeQuery(range)}`);
};

// Purchased / produced / sold, bucketed by month.
export const GetDashboardMaterialFlow = (range) => {
  return GET(`/dashboard/material-flow${dateRangeQuery(range)}`);
};

// Top 5 products by quantity sold in the period.
export const GetDashboardTopProducts = (range) => {
  return GET(`/dashboard/top-products${dateRangeQuery(range)}`);
};

// Current out-of-stock snapshot — up to 3 each of products, raw materials and
// by-products. Not period-scoped: it's "right now", so it takes no dates.
export const GetDashboardOutOfStock = () => {
  return GET(`/dashboard/out-of-stock`);
};

/* -------------------------- Product / by-product inv ----------------------- */

// Product inventory (grouped by product name).
export const GetProducts = ({
  search,
  status,
  sortBy,
  sortOrder,
  page,
  limit,
} = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.append("search", search);
  if (status && status !== "all") qs.append("status", status);
  if (sortBy) qs.append("sortBy", sortBy);
  if (sortOrder) qs.append("sortOrder", sortOrder);
  if (page) qs.append("page", page);
  if (limit) qs.append("limit", limit);
  const q = qs.toString();
  return GET(`/products${q ? `?${q}` : ""}`);
};

// By-product inventory (grouped by slug).
export const GetByProducts = ({
  search,
  status,
  sortBy,
  sortOrder,
  page,
  limit,
} = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.append("search", search);
  if (status && status !== "all") qs.append("status", status);
  if (sortBy) qs.append("sortBy", sortBy);
  if (sortOrder) qs.append("sortOrder", sortOrder);
  if (page) qs.append("page", page);
  if (limit) qs.append("limit", limit);
  const q = qs.toString();
  return GET(`/by-products${q ? `?${q}` : ""}`);
};
