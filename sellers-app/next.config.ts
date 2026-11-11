import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || 'https://seller-api.atlasbasket.com';

    return [
      {
        source: '/seller/api/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/seller/api/:path*`,
      },
      {
        source: '/api/storage/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/api/storage/:path*`,
      },
      {
        source: '/api/branding',
        destination: `${backendUrl.replace(/\/$/, '')}/api/branding`,
      },
      {
        source: '/api/branding/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/api/branding/:path*`,
      },
    ];
  },
};

export default nextConfig;
