import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PPN Finance',
    short_name: 'PPN Finance',
    description: 'Gold Pawn Finance Management System',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f9fafb',
    theme_color: '#1d4ed8',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
