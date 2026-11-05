import type { NextConfig } from 'next';

/** Sent with every response (OWASP A05). A full Content-Security-Policy is part of the Sprint 5 OWASP review. */
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Push notifications use the Notifications and Push APIs, which this policy does not govern; everything listed is off.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
];

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // No Tailwind loader: styling is CSS Modules plus app/globals.css. A "*.css" loader rule would also catch *.module.css and
  // turn every module into global CSS, so the component styles would never apply.
  async headers() {
    return [
      { source: '/(.*)', headers: SECURITY_HEADERS },
      {
        // The service worker must never be cached, or a fix would not reach browsers that already have it.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
