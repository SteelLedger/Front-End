import axios from "axios";

// === Create Axios instance ===
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "x-am-response-case": "noChange",
    "x-am-response-object-type": "no_action",
    "x-am-meta": "false",
    "x-am-secret": "685e86fde0b506ce98e9f399",
    "x-am-internationalization": "DEFAULT",
    "x-am-run-in-sandbox": "0",
    "x-am-content-type-response": "application/json",
    "x-am-cache-control": "no_action",
    "x-am-get-encrypted-data": "no_encryption",
    "x-no-compression": "true",
  },

  timeout: 180000,
});

// === Set token before request ===
axiosInstance.interceptors.request.use(
  (config) => {
    if (config.url?.includes("/api/v1/auth/login")) {
      const systemToken = localStorage.getItem("token");
      config.headers["x-am-authorization"] = systemToken || "__token__";
    } else {
      const userToken = localStorage.getItem("userToken");
      if (userToken) {
        config.headers["Authorization"] = `Bearer ${userToken}`;
      }
      const systemToken = localStorage.getItem("token");
      config.headers["x-am-authorization"] = systemToken || "__token__";
    }

    // ✅ CRITICAL FIX: Properly handle FormData
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    } else {
      // For FormData, delete Content-Type to let browser set it with boundary
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

const getNewToken = async () => {
  try {
    const response = await fetch(
      "http://172.105.39.203:38246/api/system-api/admin/token?=null",
      {
        method: "POST",
        headers: {
          "x-am-response-case": "noChange",
          "x-am-response-object-type": "no_action",
          "x-am-meta": "false",
          "x-am-secret": "685e86fde0b506ce98e9f399",
          "x-am-internationalization": "DEFAULT",
          "x-am-run-in-sandbox": "0",
          "x-am-content-type-response": "application/json",
          "x-am-cache-control": "no_action",
          "x-am-get-encrypted-data": "no_encryption",
          "x-am-sandbox-timeout": "13000",
          "x-no-compression": "true",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authTokenType: "AM",
          authTokenAM: {
            u: "default",
            p: "default",
          },
        }),
      },
    );

    const data = await response.json();
    localStorage.setItem("token", data.data.token);
    return data.data.token;
  } catch (error) {
    console.error("Failed to get new token", error);
    throw error;
  }
};

// === Response Interceptor: retry on 401 ===
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isUnauthorized =
      error.response?.status === 401 &&
      error.response?.data?.errors?.[0]?.message?.includes(
        "Authorization header 'x-am-authorization' is not valid",
      );

    if (isUnauthorized && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await getNewToken();

        originalRequest.headers["x-am-authorization"] = newToken;
        return axiosInstance(originalRequest);
      } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("userToken");
        localStorage.removeItem("userId");
        window.location.href = "/auth/login";
        return Promise.reject(err);
      }
    }

    if (
      error.response?.status === 401 &&
      originalRequest.url?.includes("/v1/api/auth/")
    ) {
      localStorage.removeItem("userToken");
      localStorage.removeItem("userData");
      localStorage.removeItem("userId");

      window.location.href = "/auth/login";
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

// === Helpers ===
export const POST = (url, data) => axiosInstance.post(url, data);
export const GET = (url, params) => axiosInstance.get(url, { params });
export const PUT = (url, data) => axiosInstance.put(url, data);
export const DELETE = (url, data, params) =>
  axiosInstance.delete(url, data, { params });

export const UPLOAD = (url, formData, config = {}) =>
  axiosInstance.post(url, formData, config);

export default axiosInstance;
