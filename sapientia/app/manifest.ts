import type { MetadataRoute } from 'next';

/** Web app manifest (plan Sprint 5): lets staff install Sapientia on a phone or computer. Icons: scripts/make-app-icons.mjs. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Sapientia',
    short_name: 'Sapientia',
    description: 'Penyelarasan tugas sekolah yang menghormati waktu bekerja guru.',
    lang: 'ms',
    start_url: '/staff',
    scope: '/',
    display: 'standalone',
    background_color: '#12151b',
    theme_color: '#12151b',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
