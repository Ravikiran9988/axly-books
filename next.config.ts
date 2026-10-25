import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components currently causes production prerender failures for
  // request-time authentication and time-dependent values in this app.
  // Re-enable only after migrating these routes to explicit request-time
  // boundaries and validating a production build.

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
    formats: ["image/avif", "image/webp"],
  },

  // Powered-by header removal for security
  poweredByHeader: false,
};

export default nextConfig;
