import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send cookies automatically
});

// Optional request interceptor (token or other headers)
// api.interceptors.request.use(...);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (!res.success) {
      // Backend returned error format
      return Promise.reject(res);
    }
    return res.data; // only return the actual data
  },
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized, redirect to login...");
      window.location.href = "/login";
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
