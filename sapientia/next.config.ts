import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Content Security Policy (OWASP A03 and A05, Sprint 5 review). Everything the app loads is its own: next/font serves the fonts,
 * and the pictures are in public/ or made in the browser (blob: for the recoloured pahlawan, data: for the profile photo).
 *
 * Scripts and styles keep 'unsafe-inline': a nonce needs every page rendered per request, which cacheComponents and partial
 * prerendering rule out (Next.js CSP guide). The other directives still stop plugins, framing, <base> hijacking, form posts
 * and fetches to other sites. React uses eval only in development.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

/** Sent with every response (OWASP A05). */
const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Push notifications use the Notifications and Push APIs, which this policy does not govern; everything listed is off.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  // HTTPS-only once deployed; browsers ignore it over plain http, so local development is unaffected.
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
];

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
    // Agents offer only security upgrades of Next.js for this app.
    agentUpgrade: 'security',
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Do not advertise the framework (OWASP A05: less for an attacker to fingerprint).
  poweredByHeader: false,
  // pdfkit reads its built-in font metrics from its own folder at run time, so it must be loaded from node_modules, not bundled.
  serverExternalPackages: ['pdfkit'],
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
