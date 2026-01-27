const path = require("path");
const defaultRuntimeCaching = require("next-pwa/cache");

// Customize caching strategy for unstable connections
const customRuntimeCaching = defaultRuntimeCaching.map((entry) => {
  // Reduce network timeout for NetworkFirst strategies (apis, others)
  if (entry.options && entry.options.networkTimeoutSeconds) {
    return {
      ...entry,
      options: {
        ...entry.options,
        networkTimeoutSeconds: 5, // Fallback to cache after 5s (was 10s)
      },
    };
  }
  return entry;
});

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/, /react-floater/],
  // Improved offline support
  reloadOnOnline: false,
  fallbacks: {
    document: "/offline",
  },
  runtimeCaching: customRuntimeCaching,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "banco-imagens-sistema-pdv.s3.sa-east-1.amazonaws.com",
      },
    ],
    // Otimização de imagens
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
  // Otimização de pacotes
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
  // Headers de segurança
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
