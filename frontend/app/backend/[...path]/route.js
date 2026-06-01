/**
 * Catch-all API route: /backend/[...path]
 *
 * Proxies every request from the Vercel frontend (HTTPS) to the
 * FastAPI backend on EC2 (HTTP).  This solves the mixed-content
 * problem without relying on next.config.mjs rewrites.
 *
 * Example:
 *   POST https://career-lens-nine.vercel.app/backend/auth/login
 *   → POST http://65.2.11.37:8000/auth/login
 */

export async function GET(request, { params }) {
  return proxyRequest(request, params, "GET");
}
export async function POST(request, { params }) {
  return proxyRequest(request, params, "POST");
}
export async function PUT(request, { params }) {
  return proxyRequest(request, params, "PUT");
}
export async function PATCH(request, { params }) {
  return proxyRequest(request, params, "PATCH");
}
export async function DELETE(request, { params }) {
  return proxyRequest(request, params, "DELETE");
}

async function proxyRequest(request, params, method) {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Resolve path segments e.g. ["auth", "login"] → "auth/login"
  const pathSegments = (await params).path || [];
  const path = pathSegments.join("/");

  // Preserve query string
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const targetUrl = `${backendUrl}/${path}${queryString ? `?${queryString}` : ""}`;

  // Forward relevant headers (drop host to avoid mismatch)
  const headers = {};
  request.headers.forEach((value, key) => {
    if (!["host", "connection"].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  // Build fetch options
  const fetchOptions = { method, headers };

  // Forward body for non-GET/HEAD requests
  if (!["GET", "HEAD"].includes(method)) {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      // Forward FormData (file uploads) as-is
      fetchOptions.body = await request.blob();
    } else {
      fetchOptions.body = await request.text();
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const responseBody = await response.arrayBuffer();

    // Forward response headers
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      if (!["transfer-encoding"].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    return new Response(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[proxy] Failed to reach backend at ${targetUrl}:`, error);
    return new Response(
      JSON.stringify({ detail: "Backend unreachable", error: error.message }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
