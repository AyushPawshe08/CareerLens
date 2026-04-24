# Bug Fix: `/auth/login` Returns 404 in Next.js 16

## Problem

Navigating to `http://localhost:3000/auth/login` returned a **404 Not Found** error, even though the page was correctly defined at `app/auth/login/page.jsx`.

### Root Cause

The project had a **stale `.next` cache** referencing a `middleware.js` file that no longer existed, causing all routes to break.

The deeper issue: **Next.js 16.2.3 renamed the middleware convention**.

| Next.js Version | File Name | Export Name |
|---|---|---|
| ≤ 15 | `middleware.js` | `export function middleware` |
| **16+** | **`proxy.js`** | **`export function proxy`** |

The project's `proxy.js` was correct for Next.js 16, but during debugging a `middleware.js` was temporarily created alongside it. This caused a conflict:

```
Error: Both middleware file "./middleware.js" and proxy file "./proxy.js" are detected.
Please use "./proxy.js" only.
```

After `middleware.js` was deleted, the `.next` server cache still held a compiled reference to it:

```
Error: Could not parse module '[project]/middleware.js', file not found
```

---

## Fix

### Step 1 — Remove `middleware.js` (the conflicting file)
```powershell
del middleware.js   # run from frontend/
```

### Step 2 — Ensure `proxy.js` exists with the correct export
`proxy.js` must be at the **root of the frontend project** (next to `package.json`) and export a function named `proxy`:

```js
// proxy.js
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register", "/verify-user"];

export function proxy(request) {      // ← must be named "proxy" in Next.js 16
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  // ... auth logic
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### Step 3 — Clear the `.next` cache and restart
```powershell
# Stop the dev server first (Ctrl+C), then:
Remove-Item -Recurse -Force .next
npm run dev
```

---

## Key Takeaway

> In **Next.js 16+**, the middleware file is `proxy.js` with `export function proxy(...)`.  
> The old `middleware.js` / `export function middleware` convention is **deprecated**.  
> If these two files ever coexist, Next.js will throw a conflict error and break all routes.  
> Always clear `.next` after resolving such conflicts.
