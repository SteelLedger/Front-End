import { POST, GET, PUT, DELETE, UPLOAD } from "./axiosInstance";

export const login = (data) => {
  return POST(`/auth/admin/login`, data);
};
