import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5000";

    return [
      {
        source: "/api/delivery/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/api/delivery/:path*`,
      },
    ];
  },
};

export default nextConfig;
