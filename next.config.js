/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['googleapis', 'google-auth-library'],
  },
  // Required for googleapis on Vercel
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'googleapis', 'google-auth-library'];
    }
    return config;
  },
};
module.exports = nextConfig;
