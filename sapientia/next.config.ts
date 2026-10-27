import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // No Tailwind loader: styling is CSS Modules plus app/globals.css. A "*.css" loader rule would also catch *.module.css and
  // turn every module into global CSS, so the component styles would never apply.
};

export default nextConfig;
