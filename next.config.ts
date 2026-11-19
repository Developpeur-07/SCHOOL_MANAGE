import type { NextConfig } from 'next';

/**
 * Cible du relais de prévisualisation, lorsqu’elle est définie.
 *
 * En prévisualisation, le navigateur joint l’application par son origine
 * publique : les appels Supabase sont alors réécrits vers un Supabase local,
 * tout comme le serveur les joint directement. Sans cette variable, aucune
 * réécriture n’existe et le déploiement se comporte normalement.
 */
const localSupabaseProxy = process.env.SUPABASE_LOCAL_PROXY_TARGET;

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.e2b.app'],
  poweredByHeader: false,
  async rewrites() {
    if (!localSupabaseProxy) return [];

    const target = localSupabaseProxy.replace(/\/$/, '');
    return [
      { source: '/auth/v1/:path*', destination: `${target}/auth/v1/:path*` },
      { source: '/rest/v1/:path*', destination: `${target}/rest/v1/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
