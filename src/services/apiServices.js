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
