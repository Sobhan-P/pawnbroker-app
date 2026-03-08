import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pawn Broker App',
    short_name: 'Pawn Broker App',
    description: 'Gold Pawn Finance Management System',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f9fafb',
    theme_color: '#1d4ed8',
    icons: [
      {
        src: '/api/pwa-icon?size=192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/api/pwa-icon?size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
