import type { Metadata } from 'next';
import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { messages } from '@/shared/config/messages';

export const metadata: Metadata = { title: messages.offline.title };

export default function OfflinePage() {
  return (
    <main
      id="contenu"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px 16px',
        background: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <section
        aria-labelledby="offline-title"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '32px 24px',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          background: '#ffffff',
          textAlign: 'center',
        }}
      >
        <WifiOff aria-hidden="true" size={44} style={{ color: '#0f766e', margin: '0 auto' }} />
        <h1 id="offline-title" style={{ margin: '20px 0 0', fontSize: '28px' }}>
          {messages.offline.title}
        </h1>
        <p style={{ margin: '12px 0 0', color: '#475569', lineHeight: 1.6 }}>
          {messages.offline.body}
        </p>
        <p style={{ margin: '12px 0 0', color: '#475569', lineHeight: 1.6 }}>
          {messages.offline.privacy}
        </p>
        <div style={{ display: 'grid', gap: '12px', marginTop: '28px' }}>
          <a
            href=""
            style={{
              minHeight: '48px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              background: '#0f766e',
              color: '#ffffff',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {messages.common.retry}
          </a>
          <Link
            href="/"
            style={{ minHeight: '48px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#115e59' }}
          >
            {messages.offline.home}
          </Link>
        </div>
      </section>
    </main>
  );
}
