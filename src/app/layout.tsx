import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';
import { messages } from '@/shared/config/messages';

export const metadata: Metadata = {
  title: {
    default: messages.app.name,
    template: `%s · ${messages.app.name}`,
  },
  description: messages.app.tagline,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f766e',
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
      </body>
    </html>
  );
}
