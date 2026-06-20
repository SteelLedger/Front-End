import axios from "axios";

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
      localStorage.removeItem("token");
      localStorage.removeItem("user");
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

export default axiosInstance;
