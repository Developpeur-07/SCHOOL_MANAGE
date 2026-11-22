import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';
import { messages } from '@/shared/config/messages';
import { getPublicSiteUrl } from '@/shared/config/site';
import { OPEN_GRAPH_IMAGE } from '@/shared/metadata';
import { ServiceWorkerRegistration } from '@/shared/pwa/service-worker-registration';
import { AudienceMeasurement } from '@/modules/privacy/ui/audience-measurement';
import { ConsentBanner } from '@/modules/privacy/ui/consent-banner';

export const metadata: Metadata = {
  // Base des URL absolues : canonical, Open Graph. Elle provient de
  // l'environnement de build, jamais d'un domaine codé en dur.
  metadataBase: new URL(getPublicSiteUrl()),
  title: {
    default: messages.app.name,
    template: `%s · ${messages.app.name}`,
  },
  description: messages.app.tagline,
  applicationName: messages.app.name,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: messages.app.name,
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      // Le favicon dédié est prioritaire : c'est lui que les navigateurs
      // demandent en premier.
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: messages.app.name,
    title: messages.app.name,
    description: messages.app.tagline,
    images: [OPEN_GRAPH_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: messages.app.name,
    description: messages.app.tagline,
    images: [OPEN_GRAPH_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Permet d’utiliser les encoches et les barres système via env(safe-area-inset-*).
  viewportFit: 'cover',
  themeColor: '#0f766e',
  colorScheme: 'light',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <a
          href="#contenu"
          className="fixed left-3 top-3 z-50 -translate-y-24 rounded-md bg-white px-4 py-3 font-semibold text-teal-800 shadow-lg focus:translate-y-0"
        >
          {messages.common.skipToContent}
        </a>
        {/*
          Le bandeau de consentement est placé avant le contenu : il ne
          masque jamais la page, et il est visible dès l'ouverture.
        */}
        <ConsentBanner />
        {children}
        <ServiceWorkerRegistration />
        {/*
          La mesure d'audience n'émet rien tant que le consentement n'a pas
          été donné : le composant lui-même vérifie le choix avant tout
          appel réseau.
        */}
        <AudienceMeasurement />
      </body>
    </html>
  );
}
