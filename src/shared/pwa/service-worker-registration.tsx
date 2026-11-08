'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    let cancelled = false;
    const register = async () => {
      try {
        if (!cancelled) await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        // L’application reste utilisable en ligne si l’enregistrement échoue.
      }
    };

    if (document.readyState === 'complete') {
      void register();
      return;
    }

    const onLoad = () => void register();
    window.addEventListener('load', onLoad, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', onLoad);
    };
  }, []);

  return null;
}
