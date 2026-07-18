import { POST, GET, PUT, DELETE } from "./axiosInstance";

export const login = (data) => {
  return POST(`/auth/admin/login`, data);
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

/* ------------------------------- Transactions ------------------------------ */

export const GetTransactionWithParty = (partyId, page = 1, limit = 10) => {
  return GET(`/transactions?partyId=${partyId}&page=${page}&limit=${limit}`);
};

export const GetTransactionWithPartyAndPurchase = (
  partyId,
  type,
  page = 1,
  limit = 10,
) => {
  return GET(
    `/transactions?partyId=${partyId}&type=${type}&page=${page}&limit=${limit}`,
  );
};

/* -------------------------------- Purchases -------------------------------- */

export const GetPurchases = ({ search, sortBy, sortOrder, page, limit } = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.append("search", search);
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
export const GetRawMaterials = ({
  search,
  sortBy,
  sortOrder,
  page,
  limit,
} = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.append("search", search);
  if (sortBy) qs.append("sortBy", sortBy);
  if (sortOrder) qs.append("sortOrder", sortOrder);
  if (page) qs.append("page", page);
  if (limit) qs.append("limit", limit);
  const q = qs.toString();
  return GET(`/raw-materials${q ? `?${q}` : ""}`);
};

/* ------------------------------- Productions ------------------------------- */

export const GetProductions = ({
  search,
  sortBy,
  sortOrder,
  page,
  limit,
} = {}) => {
  const qs = new URLSearchParams();
  if (search) qs.append("search", search);
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
