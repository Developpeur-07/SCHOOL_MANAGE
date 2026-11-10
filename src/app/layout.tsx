import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';
import { messages } from '@/shared/config/messages';
import { ServiceWorkerRegistration } from '@/shared/pwa/service-worker-registration';

export const metadata: Metadata = {
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
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
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
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
