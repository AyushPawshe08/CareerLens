/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,

  // Silence the Turbopack/webpack conflict warning in Next.js 16 dev mode
  turbopack: {},

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
