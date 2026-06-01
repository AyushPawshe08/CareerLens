/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,

  // Silence the Turbopack/webpack conflict warning in Next.js 16 dev mode
  turbopack: {},

  // ── API Proxy rewrites ──────────────────────────────────────────────────
  // Vercel (HTTPS) proxies /backend/* to the EC2 backend (HTTP) server-side.
  // Using /backend prefix avoids conflict with Next.js reserved /api routes.
  // This avoids the browser mixed-content block (HTTPS page → HTTP API).
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/backend/:path*",
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
