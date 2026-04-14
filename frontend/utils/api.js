import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
});

/**
 * Read a cookie by name (client-side only).
 * Returns null in SSR context.
 */
function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? match.split("=")[1] : null;
}

/**
 * Attach JWT from cookie (preferred) or localStorage (fallback) on every
 * outgoing request as a Bearer token.
 */
API.interceptors.request.use((config) => {
  const token = getCookie("token") || localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Global response interceptor: if the backend returns 401, clear stored
 * credentials and let the middleware redirect to login on the next navigation.
 */
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale credentials
      if (typeof document !== "undefined") {
        document.cookie =
          "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      }
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("token");
      }
    }
    return Promise.reject(error);
  }
);

export default API;