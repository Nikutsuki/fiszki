/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Cloudflare optimizations that can interfere with fetch requests
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'cf-cache-status',
            value: 'BYPASS',
          },
          {
            key: 'cache-control',
            value: 'no-transform',
          },
        ],
      },
    ];
  },
  // Other configurations can be added here
};

export default nextConfig;
