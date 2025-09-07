import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Fix chunk loading issues
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
    };

    // Ensure proper module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
    };

    return config;
  },
  // Add experimental features to handle chunk loading
  experimental: {
    optimizePackageImports: ['@mantine/core', '@tabler/icons-react'],
  },
};

export default nextConfig;
