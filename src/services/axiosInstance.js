import axios from "axios";
import { clearSession } from "../utils/auth";

// === Create Axios instance ===
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },

  timeout: 180000,
});

// Attach the auth token (saved at login) to every request.
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On an expired / invalid session, clear creds and bounce to login.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
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
