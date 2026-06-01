/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,

  // Silence the Turbopack/webpack conflict warning in Next.js 16 dev mode
  turbopack: {},

  // ── API Proxy rewrites ──────────────────────────────────────────────────
  // Vercel (HTTPS) proxies /api/* to the EC2 backend (HTTP) server-side.
  // This avoids the browser mixed-content block (HTTPS page → HTTP API).
  // In local dev, NEXT_PUBLIC_API_URL is empty so it falls back to localhost.
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },

  // webpack config still applies for `next build` (production)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // html2pdf.js / html2canvas rely on browser APIs — stub canvas on server
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    return config;
  },
};

export default nextConfig;
