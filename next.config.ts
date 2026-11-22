import type { NextConfig } from 'next';

/**
 * Cible du relais de prévisualisation, lorsqu'elle est définie.
 *
 * En prévisualisation, le navigateur joint l’application par son origine
 * publique : les appels Supabase sont alors réécrits vers un Supabase local,
 * tout comme le serveur les joint directement. Sans cette variable, aucune
 * réécriture n’existe et le déploiement se comporte normalement.
 */
const localSupabaseProxy = process.env.SUPABASE_LOCAL_PROXY_TARGET;

/**
 * En-têtes de sécurité appliqués à toutes les réponses.
 *
 * - `Strict-Transport-Security` : impose le HTTPS pendant deux ans.
 * - `X-Content-Type-Options` : empêche l’interprétation d’un type MIME
 *   différent de celui annoncé.
 * - `Referrer-Policy` : ne transmet que l’origine de la page précédente,
 *   ce qui évite de fuiter une URL de connexion.
 * - `X-Frame-Options` : interdit l’inclusion du site dans un cadre tiers.
 * - `Permissions-Policy` : désactive les fonctions du navigateur qui ne
 *   sont pas utilisées par l’application.
 * - `Cross-Origin-Opener-Policy` : isole la fenêtre des autres origines.
 */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.e2b.app'],
  poweredByHeader: false,
  // Compression des réponses : activée par défaut, elle est explicitée
  // pour que le comportement soit visible et vérifiable.
  compress: true,
  images: {
    // Les formats modernes sont servis en priorité : un même visuel pèse
    // nettement moins lourd en AVIF puis en WebP.
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    if (!localSupabaseProxy) return [];

    const target = localSupabaseProxy.replace(/\/$/, '');
    return [
      { source: '/auth/v1/:path*', destination: `${target}/auth/v1/:path*` },
      { source: '/rest/v1/:path*', destination: `${target}/rest/v1/:path*` },
    ];
  },
  async redirects() {
    // La redirection vers HTTPS est réalisée par le proxy : elle doit
    // conserver l'hôte réellement demandé, ce que la configuration ne peut
    // pas exprimer.
    return [];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
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
