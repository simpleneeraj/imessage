import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Love Quotes',
    short_name: 'Love Quotes',
    description: 'A small collection of words about love.',
    start_url: '/',
    display: 'standalone',
    background_color: '#e9e2d7',
    theme_color: '#e9e2d7',
    icons: [
      { src: '/logo/icon-192.png', sizes: '192x192', type: 'image/png' },
      {
        src: '/logo/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
