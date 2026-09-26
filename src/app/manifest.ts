import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BhuSetu - National Land Acquisition System',
    short_name: 'BhuSetu',
    description: 'End-to-End Digital Monitoring and Decision Support for RFCTLARR Act 2013',
    start_url: '/workspace',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon512_maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon512_rounded.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      }
    ],
  };
}
