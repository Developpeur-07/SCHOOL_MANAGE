/* SCHOOL_MANAGE — cache PWA sans données authentifiées ni réponse Supabase. */
const CACHE_VERSION = 'v1';
const PAGE_CACHE = `school-manage-pages-${CACHE_VERSION}`;
const ASSET_CACHE = `school-manage-assets-${CACHE_VERSION}`;
const APP_CACHE_PREFIX = 'school-manage-';
const OFFLINE_URL = '/hors-ligne';
const PUBLIC_PAGES = new Set(['/', '/compte-desactive', OFFLINE_URL]);
const PRECACHE_URLS = [
  '/',
  '/compte-desactive',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

function isCacheableStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.ico';
}

function isUsableResponse(response) {
  return response && response.ok && response.type === 'basic';
}

async function precachePublicShell() {
  const cache = await caches.open(PAGE_CACHE);
  await cache.addAll(PRECACHE_URLS);
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isUsableResponse(response)) {
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function publicPageNetworkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    // Seules ces trois pages publiques, sans contenu utilisateur, sont éligibles.
    if (isUsableResponse(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) ||
      (await cache.match(OFFLINE_URL)) ||
      Response.error();
  }
}

async function privatePageNetworkOnly(request) {
  try {
    // Aucun cache.put ici : connexion, profils et espaces restent network-only.
    return await fetch(request);
  } catch {
    const cache = await caches.open(PAGE_CACHE);
    return (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precachePublicShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(APP_CACHE_PREFIX) && ![PAGE_CACHE, ASSET_CACHE].includes(name))
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Les réponses RSC et les appels API ne sont jamais interceptés ni stockés.
  if (request.headers.get('RSC') || url.searchParams.has('_rsc') || url.pathname.startsWith('/api/')) {
    return;
  }

  if (isCacheableStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      PUBLIC_PAGES.has(url.pathname)
        ? publicPageNetworkFirst(request)
        : privatePageNetworkOnly(request),
    );
  }
});
