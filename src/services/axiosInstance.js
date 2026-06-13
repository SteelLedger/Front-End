import axios from "axios";

// === Create Axios instance ===
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },

  timeout: 180000,
});

// === Helpers ===
export const POST = (url, data) => axiosInstance.post(url, data);
export const GET = (url, params) => axiosInstance.get(url, { params });
export const PUT = (url, data) => axiosInstance.put(url, data);
export const DELETE = (url, data, params) =>
  axiosInstance.delete(url, data, { params });

export const UPLOAD = (url, formData, config = {}) =>
  axiosInstance.post(url, formData, config);

export default axiosInstance;
