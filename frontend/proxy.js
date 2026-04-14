/**
 * middleware.js — Next.js Edge Middleware
 *
 * Runs before every request to enforce route protection.
 *
 * PUBLIC ROUTES (no auth required):
 *   /               → Landing page
 *   /auth/login     → Login page
 *   /auth/register  → Register page
 *   /verify-user    → OTP verification (post-registration only)
 *
 * PRIVATE ROUTES (JWT cookie required):
 *   /job-input
 *   /analysis/:input_id
 *   /interview-questions/:input_id
 *   /resume
 *
 * If an unauthenticated user tries to access a private route they are
 * redirected to /auth/login. The original destination is passed as a
 * `next` query param so the login page can redirect back after success.
 */

import { NextResponse } from "next/server";

/** Routes that do NOT require authentication */
const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/register",
  "/verify-user",
];

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // ── Always allow public paths ────────────────────────────────────────────
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // ── Allow Next.js internals and static assets ────────────────────────────
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // ── Check for JWT token in cookies ──────────────────────────────────────
  const token = request.cookies.get("token")?.value;

  if (!token) {
    // Redirect to login, preserve intended destination
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated — proceed
  return NextResponse.next();
}

/**
 * Apply middleware to all routes except Next.js internals.
 * The PUBLIC_PATHS check inside the function itself handles the rest.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
