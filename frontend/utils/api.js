import axios from "axios";

/**
 * API base URL strategy:
 *
 *  • Local dev  (npm run dev):
 *      NEXT_PUBLIC_API_URL=http://localhost:8000  (set in .env.local)
 *      → Axios talks directly to the FastAPI server. No proxy needed.
 *
 *  • Production (Vercel):
 *      NEXT_PUBLIC_API_URL=<your deployed backend URL>  (set in Vercel dashboard)
 *      → Axios talks directly to the deployed backend.
 *
 *  • Fallback (neither env var set):
 *      Uses /backend which Next.js rewrites proxy to the backend.
 */
const baseURL = process.env.NEXT_PUBLIC_API_URL || "/backend";

const API = axios.create({
  baseURL,
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
 * credentials and redirect to login — but ONLY if the user is on a
 * protected page. Public pages (/, /auth/*) must NOT trigger a redirect
 * because the Navbar calls get-current-user there too (unauthenticated).
 */

/** Pages that do NOT require authentication — never auto-redirect from these */
const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register", "/auth/verify-user", "/verify-user"];

API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only act on real 401 HTTP responses — ignore network errors (no response)
    // Skip if the caller opted out of auto-redirect (e.g. Navbar's user fetch)
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
      // Clear stale credentials
      if (typeof document !== "undefined") {
        document.cookie =
          "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      }
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("token");
      }
      // Redirect to login ONLY from protected pages
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        const isPublic = PUBLIC_PATHS.some(
          (p) => currentPath === p || currentPath.startsWith("/auth/")
        );
        if (!isPublic) {
          window.location.href = `/auth/login?next=${encodeURIComponent(currentPath)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;