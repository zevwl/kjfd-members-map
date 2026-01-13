import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict React mode is on by default in 16, but good to be explicit
  reactStrictMode: true,
  // Ensure we can use Google Maps script
  transpilePackages: ['@react-google-maps/api'],
  experimental: {
    // optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
