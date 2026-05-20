import type { NextConfig } from 'next';

type WebpackConfigLike = {
  resolve?: {
    fallback?: Record<string, false | string>;
  };
};

const nextConfig: NextConfig = {
  experimental: { typedRoutes: false },
  webpack: (config: WebpackConfigLike, options: { isServer?: boolean }) => {
    if (!options.isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;
