import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  /* The dev-tools badge pollutes visual-regression captures — disabled
     (production behavior is unaffected). */
  devIndicators: false,
};

export default nextConfig;
