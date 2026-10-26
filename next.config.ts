import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components and partial prefetching stay enabled; routes that rely on
  // authenticated request data explicitly opt into request-time rendering.
  cacheComponents: true,
  partialPrefetching: true,

  // Production security headers
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
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },

  // Image optimization configuration
  images: {
    // Book covers accept administrator-supplied HTTPS URLs from many hosts.
    // Disable Next's host-restricted optimizer so valid external covers render consistently.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },

  // Powered-by header removal for security
  poweredByHeader: false,
};

export default nextConfig;
